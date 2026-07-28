import { createHash } from "node:crypto";
import { AVALANCHE_X402, BYTES32, EVM_ADDRESS } from "./config";

export type AvalancheX402Requirement = {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: {
    name?: string;
    version?: string;
  };
};

export type FrozenAvalancheX402Payment = {
  paymentId: string;
  x402Version: 2;
  scheme: "exact";
  network: "eip155:43113";
  resource: {
    url: string;
    method: string;
    bodyHash: string;
  };
  payer: string;
  payTo: string;
  asset: string;
  amount: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
  status: "prepared";
  signature: null;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalPaymentId(input: Omit<FrozenAvalancheX402Payment, "paymentId" | "status" | "signature">) {
  return `avax_x402_${sha256(JSON.stringify(input))}`;
}

export function freezeAvalancheX402Payment(input: {
  requirement: AvalancheX402Requirement;
  resourceUrl: string;
  method: string;
  bodyHash: string;
  payer: string;
  nonce: `0x${string}`;
  nowSeconds: number;
}): FrozenAvalancheX402Payment {
  const requirement = input.requirement;
  if (
    requirement.scheme !== AVALANCHE_X402.scheme ||
    requirement.network !== AVALANCHE_X402.network
  ) throw new Error("avalanche_x402_requirement_not_fuji_v2_exact");
  if (
    requirement.asset.toLowerCase() !== AVALANCHE_X402.asset.address.toLowerCase()
  ) throw new Error("avalanche_x402_asset_mismatch");
  if (!EVM_ADDRESS.test(input.payer) || !EVM_ADDRESS.test(requirement.payTo)) {
    throw new Error("avalanche_x402_invalid_address");
  }
  if (!BYTES32.test(input.nonce)) throw new Error("avalanche_x402_invalid_nonce");
  const resource = new URL(input.resourceUrl);
  const isHttps = resource.protocol === "https:";
  const isLocalHttp = resource.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(resource.hostname);
  if (!isHttps && !isLocalHttp) throw new Error("avalanche_x402_secure_resource_required");
  if (!/^[a-f0-9]{64}$/.test(input.bodyHash)) {
    throw new Error("avalanche_x402_invalid_body_hash");
  }
  if (!Number.isInteger(requirement.maxTimeoutSeconds) || requirement.maxTimeoutSeconds <= 0) {
    throw new Error("avalanche_x402_invalid_timeout");
  }
  if (!/^[1-9]\d*$/.test(requirement.amount)) {
    throw new Error("avalanche_x402_invalid_amount");
  }
  const amount = BigInt(requirement.amount);
  if (amount > AVALANCHE_X402.maxAmountAtomic) {
    throw new Error("avalanche_x402_amount_above_safety_cap");
  }
  if (
    requirement.extra?.name !== undefined &&
    requirement.extra.name !== AVALANCHE_X402.asset.eip712Name
  ) throw new Error("avalanche_x402_token_name_mismatch");
  if (
    requirement.extra?.version !== undefined &&
    requirement.extra.version !== AVALANCHE_X402.asset.eip712Version
  ) throw new Error("avalanche_x402_token_version_mismatch");

  const validity = Math.min(
    requirement.maxTimeoutSeconds,
    AVALANCHE_X402.maxAuthorizationSeconds,
  );
  const method = input.method.toUpperCase();
  if (method !== "POST") throw new Error("avalanche_x402_method_mismatch");
  const frozen = {
    x402Version: 2 as const,
    scheme: "exact" as const,
    network: "eip155:43113" as const,
    resource: {
      url: input.resourceUrl,
      method,
      bodyHash: input.bodyHash,
    },
    payer: input.payer.toLowerCase(),
    payTo: requirement.payTo.toLowerCase(),
    asset: requirement.asset.toLowerCase(),
    amount: requirement.amount,
    validAfter: String(input.nowSeconds - 5),
    validBefore: String(input.nowSeconds + validity),
    nonce: input.nonce.toLowerCase() as `0x${string}`,
  };
  return {
    paymentId: canonicalPaymentId(frozen),
    ...frozen,
    status: "prepared",
    signature: null,
  };
}

export function buildTransferWithAuthorizationTypedData(
  payment: FrozenAvalancheX402Payment,
) {
  return {
    domain: {
      name: AVALANCHE_X402.asset.eip712Name,
      version: AVALANCHE_X402.asset.eip712Version,
      chainId: AVALANCHE_X402.chainId,
      verifyingContract: AVALANCHE_X402.asset.address,
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
      from: payment.payer,
      to: payment.payTo,
      value: payment.amount,
      validAfter: payment.validAfter,
      validBefore: payment.validBefore,
      nonce: payment.nonce,
    },
  } as const;
}
