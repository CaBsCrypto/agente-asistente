import { Keypair } from "@stellar/stellar-sdk";
import { X402_TESTNET_RESOURCE } from "../app/x402/assets";
import {
  createSignedX402Payload,
  prepareX402ClientAuthorization,
} from "../app/x402/client-authorization";
import { inspectX402Resource } from "../app/x402/protocol";
import { INTERNAL_TESTNET_USDC_DISTRIBUTOR_ADDRESS } from "../app/x402/testnet-faucet";

async function main() {
  const challenge = await inspectX402Resource(X402_TESTNET_RESOURCE);
  const prepared = await prepareX402ClientAuthorization({
    x402Version: challenge.paymentRequired.x402Version,
    requirement: challenge.requirement,
    address: INTERNAL_TESTNET_USDC_DISTRIBUTOR_ADDRESS,
  });

  let signedTransactionBytes: number | null = null;
  const distributorSecret =
    process.env.STELLAR_TESTNET_USDC_DISTRIBUTOR_SECRET?.trim();
  if (distributorSecret) {
    const signer = Keypair.fromSecret(distributorSecret);
    if (signer.publicKey() !== INTERNAL_TESTNET_USDC_DISTRIBUTOR_ADDRESS) {
      throw new Error("testnet_usdc_distributor_mismatch");
    }
    const signature = `0x${signer.sign(
      Buffer.from(prepared.authorizationHash.slice(2), "hex"),
    ).toString("hex")}`;
    const signed = await createSignedX402Payload({
      prepared,
      address: signer.publicKey(),
      signature,
    });
    signedTransactionBytes = signed.transaction.length;
  }

  console.log(JSON.stringify({
    ok: true,
    x402Version: prepared.x402Version,
    authorizationHash: prepared.authorizationHash,
    maxLedger: prepared.maxLedger,
    amountAtomic: prepared.requirement.amount,
    payTo: prepared.requirement.payTo,
    serializedBytes: prepared.transactionJson.length,
    signatureVerified: signedTransactionBytes !== null,
    signedTransactionBytes,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
