import assert from "node:assert/strict";
import test from "node:test";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import {
  AVALANCHE_X402_CLIENT,
  avalancheX402SessionKey,
  encodePreparedAvalancheX402Signature,
  type PreparedAvalancheX402,
  validatePreparedAvalancheX402,
} from "../app/agent/avalanche-x402-client";

const ORIGIN = "http://localhost:3001";
const RESOURCE_URL = `${ORIGIN}/api/demo/avalanche-report`;
const WALLET = `0x${"a".repeat(40)}`;
const PAY_TO = `0x${"b".repeat(40)}`;
const NONCE = `0x${"c".repeat(64)}` as `0x${string}`;

function preparedFixture(): PreparedAvalancheX402 {
  const requirement = {
    scheme: "exact",
    network: AVALANCHE_X402_CLIENT.network,
    asset: AVALANCHE_X402_CLIENT.asset,
    amount: AVALANCHE_X402_CLIENT.amountAtomic,
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2", primaryType: "TransferWithAuthorization", decimals: 6 },
  };
  return {
    replayed: false,
    requiresExplicitApproval: true,
    facilitator: {
      provider: "0xgasless",
      discoveryEndpoint: "/tokens",
      protocolVersion: 2,
      scheme: "exact",
      network: AVALANCHE_X402_CLIENT.network,
      chainId: AVALANCHE_X402_CLIENT.chainId,
      tokenAddress: AVALANCHE_X402_CLIENT.asset,
      tokenDecimals: 6,
      settlement: "eip3009",
      approveRequired: false,
      gasSponsored: true,
      eip712Domain: {
        name: "USD Coin",
        version: "2",
      },
    },
    payment: {
      id: "avax_x402_fixture_payment",
      walletAddress: WALLET,
      resourceUrl: RESOURCE_URL,
      network: AVALANCHE_X402_CLIENT.network,
      asset: "USDC",
      assetContract: AVALANCHE_X402_CLIENT.asset,
      payTo: PAY_TO,
      amountAtomic: AVALANCHE_X402_CLIENT.amountAtomic,
      amountDisplay: AVALANCHE_X402_CLIENT.amountDisplay,
      status: "prepared",
      transactionHash: null,
      error: null,
      expiresAt: "2030-01-01T00:01:00.000Z",
      typedData: {
        domain: {
          name: "USD Coin",
          version: "2",
          chainId: AVALANCHE_X402_CLIENT.chainId,
          verifyingContract: AVALANCHE_X402_CLIENT.asset,
        },
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        },
        primaryType: "TransferWithAuthorization",
        message: {
          from: WALLET,
          to: PAY_TO,
          value: AVALANCHE_X402_CLIENT.amountAtomic,
          validAfter: "1800000000",
          validBefore: "1800000060",
          nonce: NONCE,
        },
      },
    },
    paymentRequired: {
      x402Version: 2,
      resource: {
        url: RESOURCE_URL,
        description: AVALANCHE_X402_CLIENT.reportDescription,
        mimeType: "application/json",
      },
      accepts: [requirement],
    },
  };
}

function mutated(
  mutate: (fixture: PreparedAvalancheX402) => void,
) {
  const fixture = structuredClone(preparedFixture());
  mutate(fixture);
  return fixture;
}

test("accepts only the exact prepared Fuji payment requiring explicit approval", () => {
  const prepared = preparedFixture();
  assert.equal(validatePreparedAvalancheX402(prepared, ORIGIN), prepared);
  assert.equal(prepared.requiresExplicitApproval, true);
  assert.equal(prepared.payment.network, "eip155:43113");
  assert.equal(prepared.payment.amountDisplay, "0.01");
  assert.equal(prepared.facilitator.settlement, "eip3009");
  assert.equal(prepared.facilitator.gasSponsored, true);
});

test("rejects wrong origin, chain, token, amount, payTo or resource binding", () => {
  const cases: Array<[string, PreparedAvalancheX402]> = [
    ["origin", preparedFixture()],
    ["chain", mutated((value) => { value.payment.typedData.domain.chainId = 43114; })],
    ["token", mutated((value) => { value.payment.assetContract = `0x${"d".repeat(40)}`; })],
    ["amount", mutated((value) => { value.payment.amountAtomic = "10001"; })],
    ["payTo", mutated((value) => { value.payment.typedData.message.to = `0x${"e".repeat(40)}`; })],
    ["description", mutated((value) => { value.paymentRequired.resource.description = undefined; })],
    ["resource", mutated((value) => {
      value.paymentRequired.resource.url = `${ORIGIN}/api/demo/other-report`;
    })],
    ["facilitator", mutated((value) => { value.facilitator.provider = "other" as "0xgasless"; })],
    ["settlement", mutated((value) => { value.facilitator.settlement = "a402" as "eip3009"; })],
  ];

  for (const [label, prepared] of cases) {
    const expectedOrigin = label === "origin" ? "https://attacker.example" : ORIGIN;
    assert.throws(
      () => validatePreparedAvalancheX402(prepared, expectedOrigin),
      /avalanche_x402_prepared_payment_mismatch/,
      label,
    );
  }
});

test("rejects malformed Privy signatures before creating a payment header", () => {
  for (const signature of ["", "0x1234", `0x${"g".repeat(130)}`, `0x${"1".repeat(128)}`]) {
    assert.throws(
      () => encodePreparedAvalancheX402Signature({
        prepared: preparedFixture(),
        signature,
      }),
      /avalanche_x402_invalid_privy_signature/,
    );
  }
});

test("PAYMENT-SIGNATURE binds payment, method, resource and canonical body hash", () => {
  const prepared = preparedFixture();
  const header = encodePreparedAvalancheX402Signature({
    prepared,
    signature: `0x${"1".repeat(130)}`,
  });
  const payload = decodePaymentSignatureHeader(header);
  const extension = payload.extensions?.carmelita as {
    paymentId?: string;
    method?: string;
    resourceUrl?: string;
    bodyHash?: string;
  };

  assert.equal(payload.x402Version, 2);
  assert.equal(payload.accepted.network, "eip155:43113");
  assert.equal(payload.resource?.description, AVALANCHE_X402_CLIENT.reportDescription);
  assert.equal(payload.resource?.mimeType, "application/json");
  assert.equal(extension.paymentId, prepared.payment.id);
  assert.equal(extension.method, "POST");
  assert.equal(extension.resourceUrl, prepared.payment.resourceUrl);
  assert.equal(extension.bodyHash, AVALANCHE_X402_CLIENT.bodyHash);
  assert.equal(extension.bodyHash, "6a0c7603b7673730abfe3dd8fc0581256232110fbb4d0a3ce87b204e092db893");
});

test("session key is deterministic and payment-scoped", () => {
  assert.equal(
    avalancheX402SessionKey("payment-1"),
    "carmelita:avalanche-x402:payment-1",
  );
  assert.equal(
    avalancheX402SessionKey("payment-1"),
    avalancheX402SessionKey("payment-1"),
  );
  assert.notEqual(
    avalancheX402SessionKey("payment-1"),
    avalancheX402SessionKey("payment-2"),
  );
});
