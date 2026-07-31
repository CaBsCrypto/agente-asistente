import { AVALANCHE_X402, EVM_SIGNATURE } from "./config";
import {
  buildTransferWithAuthorizationTypedData,
  type FrozenAvalancheX402Payment,
} from "./payment";

export type InteractiveEip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export type SignedAvalancheX402Payment = {
  paymentId: string;
  status: "signed";
  signature: `0x${string}`;
  signedAt: string;
};

export function bindAvalancheX402Signature(input: {
  payment: FrozenAvalancheX402Payment;
  existing: SignedAvalancheX402Payment | null;
  signature: string;
  nowSeconds: number;
}): SignedAvalancheX402Payment {
  if (!EVM_SIGNATURE.test(input.signature)) {
    throw new Error("avalanche_x402_invalid_privy_signature");
  }
  const signature = input.signature.toLowerCase() as `0x${string}`;
  if (input.existing) {
    if (
      input.existing.paymentId !== input.payment.paymentId ||
      input.existing.signature !== signature
    ) throw new Error("avalanche_x402_signature_already_bound");
    return input.existing;
  }
  return {
    paymentId: input.payment.paymentId,
    status: "signed",
    signature,
    signedAt: new Date(input.nowSeconds * 1_000).toISOString(),
  };
}
export async function signAvalancheX402WithPrivy(input: {
  provider: InteractiveEip1193Provider;
  payment: FrozenAvalancheX402Payment;
  explicitUserConfirmation: boolean;
  nowSeconds: number;
}) {
  if (!input.explicitUserConfirmation) {
    throw new Error("avalanche_x402_explicit_confirmation_required");
  }
  if (input.payment.status !== "prepared" || input.payment.signature !== null) {
    throw new Error("avalanche_x402_payment_not_signable");
  }
  if (BigInt(input.payment.validBefore) <= BigInt(input.nowSeconds)) {
    throw new Error("avalanche_x402_authorization_expired");
  }
  const chainId = await input.provider.request({ method: "eth_chainId" });
  if (
    typeof chainId !== "string" ||
    Number(BigInt(chainId)) !== AVALANCHE_X402.chainId
  ) throw new Error("avalanche_x402_privy_chain_mismatch");

  const typedData = buildTransferWithAuthorizationTypedData(input.payment);
  const signature = await input.provider.request({
    method: "eth_signTypedData_v4",
    params: [input.payment.payer, JSON.stringify(typedData)],
  });
  if (typeof signature !== "string" || !EVM_SIGNATURE.test(signature)) {
    throw new Error("avalanche_x402_invalid_privy_signature");
  }
  const authorization = bindAvalancheX402Signature({
    payment: input.payment,
    existing: null,
    signature,
    nowSeconds: input.nowSeconds,
  });
  return {
    paymentId: input.payment.paymentId,
    authorization,
    typedData,
  };
}
