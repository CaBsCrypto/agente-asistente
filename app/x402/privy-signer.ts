import { createHash } from "node:crypto";
import { hash } from "@stellar/stellar-sdk";
import { Networks } from "@stellar/stellar-sdk";
import type { ClientStellarSigner } from "@x402/stellar";
import { signStellarTransactionHash } from "@/app/privy-stellar";

export function x402AuthEntryDigest(authEntry: string) {
  return hash(Buffer.from(authEntry, "base64"));
}

export function createPrivyX402Signer(input: {
  userId: string;
  accessToken: string;
  walletId: string;
  address: string;
  paymentId: string;
}): ClientStellarSigner {
  return {
    address: input.address,
    signAuthEntry: async (authEntry, options) => {
      if (
        options?.networkPassphrase &&
        options.networkPassphrase !== Networks.TESTNET
      ) {
        throw new Error("x402_mainnet_disabled");
      }
      if (options?.address && options.address !== input.address) {
        throw new Error("x402_signer_address_mismatch");
      }

      const digest = x402AuthEntryDigest(authEntry);
      const authEntryId = createHash("sha256")
        .update(authEntry)
        .digest("hex")
        .slice(0, 32);
      const signature = await signStellarTransactionHash({
        userId: input.userId,
        accessToken: input.accessToken,
        walletId: input.walletId,
        address: input.address,
        hash: digest,
        idempotencyKey: `${input.paymentId}:auth:${authEntryId}`,
      });

      return {
        signedAuthEntry: Buffer.from(signature).toString("base64"),
        signerAddress: input.address,
      };
    },
  };
}
