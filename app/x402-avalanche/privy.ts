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

export type Eip712TypedData = {
  domain: Record<string, unknown>;
  types: Record<string, readonly unknown[]>;
  primaryType: string;
  message: Record<string, unknown>;
};

export type Eip712SigningErrorCodes = {
  confirmationRequired: string;
  alreadySigned: string;
  expired: string;
  chainMismatch: string;
  invalidSignature: string;
};

const DEFAULT_EIP712_ERROR_CODES: Eip712SigningErrorCodes = {
  confirmationRequired: "eip712_explicit_confirmation_required",
  alreadySigned: "eip712_already_signed",
  expired: "eip712_authorization_expired",
  chainMismatch: "eip712_chain_mismatch",
  invalidSignature: "eip712_invalid_signature",
};

export type Eip712SignedWithPrivy = {
  signature: `0x${string}`;
  typedData: Eip712TypedData;
  signedAt: string;
};

export async function signEip712WithPrivy(input: {
  provider: InteractiveEip1193Provider;
  account: string;
  chainId: number;
  typedData: Eip712TypedData;
  explicitUserConfirmation: boolean;
  nowSeconds: number;
  validBeforeSeconds?: number | string;
  alreadySigned?: boolean;
  errors?: Partial<Eip712SigningErrorCodes>;
}): Promise<Eip712SignedWithPrivy> {
  const errors = { ...DEFAULT_EIP712_ERROR_CODES, ...input.errors };
  if (!input.explicitUserConfirmation) {
    throw new Error(errors.confirmationRequired);
  }
  if (input.alreadySigned) {
    throw new Error(errors.alreadySigned);
  }
  if (
    input.validBeforeSeconds !== undefined &&
    BigInt(input.validBeforeSeconds) <= BigInt(input.nowSeconds)
  ) throw new Error(errors.expired);
  const chainId = await input.provider.request({ method: "eth_chainId" });
  if (
    typeof chainId !== "string" ||
    BigInt(chainId) !== BigInt(input.chainId)
  ) throw new Error(errors.chainMismatch);
  const signature = await input.provider.request({
    method: "eth_signTypedData_v4",
    params: [input.account, JSON.stringify(input.typedData)],
  });
  if (typeof signature !== "string" || !EVM_SIGNATURE.test(signature)) {
    throw new Error(errors.invalidSignature);
  }
  return {
    signature: signature.toLowerCase() as `0x${string}`,
    typedData: input.typedData,
    signedAt: new Date(input.nowSeconds * 1_000).toISOString(),
  };
}

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
  if (input.payment.status !== "prepared" || input.payment.signature !== null) {
    throw new Error("avalanche_x402_payment_not_signable");
  }
  const typedData = buildTransferWithAuthorizationTypedData(input.payment);
  const signed = await signEip712WithPrivy({
    provider: input.provider,
    account: input.payment.payer,
    chainId: AVALANCHE_X402.chainId,
    typedData,
    explicitUserConfirmation: input.explicitUserConfirmation,
    nowSeconds: input.nowSeconds,
    validBeforeSeconds: input.payment.validBefore,
    errors: {
      confirmationRequired: "avalanche_x402_explicit_confirmation_required",
      alreadySigned: "avalanche_x402_payment_not_signable",
      expired: "avalanche_x402_authorization_expired",
      chainMismatch: "avalanche_x402_privy_chain_mismatch",
      invalidSignature: "avalanche_x402_invalid_privy_signature",
    },
  });
  const authorization = bindAvalancheX402Signature({
    payment: input.payment,
    existing: null,
    signature: signed.signature,
    nowSeconds: input.nowSeconds,
  });
  return {
    paymentId: input.payment.paymentId,
    authorization,
    typedData,
  };
}
