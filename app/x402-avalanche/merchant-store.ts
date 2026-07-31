import type { PaymentPayload, PaymentRequirements, SettleResponse } from "@x402/core/types";
import type { AvalancheMerchantAuthorization, AvalancheMerchantResource } from "./merchant-protocol";

export type MerchantPaymentStatus = "verified" | "settling" | "settled" | "delivered" | "failed" | "reconciliation_required";
export type MerchantPaymentRecord = {
  merchantId: string; resourceId: string; paymentIdentifier: string; fingerprint: string;
  signatureHash: string; authorization: AvalancheMerchantAuthorization; requirement: PaymentRequirements;
  payload: PaymentPayload; status: MerchantPaymentStatus; settlement: SettleResponse | null;
  transactionHash: string | null; delivery: { body: unknown; bodyHash: string } | null; error: string | null;
};
export interface AvalancheMerchantPaymentStore {
  claim(input: { resource: AvalancheMerchantResource; paymentIdentifier: string; fingerprint: string; signatureHash: string; authorization: AvalancheMerchantAuthorization; requirement: PaymentRequirements; payload: PaymentPayload }): Promise<{ record: MerchantPaymentRecord; replayed: boolean }>;
  beginSettlement(input: { merchantId: string; resourceId: string; paymentIdentifier: string }): Promise<MerchantPaymentRecord>;
  settle(input: { merchantId: string; resourceId: string; paymentIdentifier: string; settlement: SettleResponse }): Promise<MerchantPaymentRecord>;
  fail(input: { merchantId: string; resourceId: string; paymentIdentifier: string; status: "failed" | "reconciliation_required"; error: string }): Promise<MerchantPaymentRecord>;
  deliver(input: { merchantId: string; resourceId: string; paymentIdentifier: string; body: unknown; bodyHash: string }): Promise<{ record: MerchantPaymentRecord; replayed: boolean }>;
}
function key(input: { merchantId: string; resourceId: string; paymentIdentifier: string }) { return `${input.merchantId}:${input.resourceId}:${input.paymentIdentifier}`; }
export class InMemoryAvalancheMerchantPaymentStore implements AvalancheMerchantPaymentStore {
  private records = new Map<string, MerchantPaymentRecord>();
  private signatures = new Map<string, string>();
  private nonces = new Map<string, string>();
  async claim(input: Parameters<AvalancheMerchantPaymentStore["claim"]>[0]) {
    const recordKey = key({ merchantId: input.resource.merchantId, resourceId: input.resource.resourceId, paymentIdentifier: input.paymentIdentifier });
    const existing = this.records.get(recordKey);
    if (existing) {
      if (existing.fingerprint !== input.fingerprint || existing.signatureHash !== input.signatureHash || existing.authorization.nonce !== input.authorization.nonce) throw new Error("merchant_x402_idempotency_conflict");
      return { record: structuredClone(existing), replayed: true };
    }
    if (this.signatures.has(input.signatureHash)) throw new Error("merchant_x402_signature_replay");
    const nonceKey = `${input.requirement.asset.toLowerCase()}:${input.authorization.from}:${input.authorization.nonce}`;
    if (this.nonces.has(nonceKey)) throw new Error("merchant_x402_nonce_replay");
    const record: MerchantPaymentRecord = { merchantId: input.resource.merchantId, resourceId: input.resource.resourceId, paymentIdentifier: input.paymentIdentifier, fingerprint: input.fingerprint, signatureHash: input.signatureHash, authorization: input.authorization, requirement: input.requirement, payload: input.payload, status: "verified", settlement: null, transactionHash: null, delivery: null, error: null };
    this.records.set(recordKey, record); this.signatures.set(input.signatureHash, recordKey); this.nonces.set(nonceKey, recordKey);
    return { record: structuredClone(record), replayed: false };
  }
  async beginSettlement(input: { merchantId: string; resourceId: string; paymentIdentifier: string }) {
    const record = this.require(input);
    if (record.status === "verified") record.status = "settling";
    else if (record.status === "settling") throw new Error("merchant_x402_settlement_in_progress");
    else if (!["settled", "delivered"].includes(record.status)) throw new Error(`merchant_x402_settlement_not_allowed:${record.status}`);
    return structuredClone(record);
  }
  async settle(input: { merchantId: string; resourceId: string; paymentIdentifier: string; settlement: SettleResponse }) {
    const record = this.require(input); if (record.status !== "settling") throw new Error("merchant_x402_settlement_state_conflict");
    record.status = "settled"; record.settlement = input.settlement; record.transactionHash = input.settlement.transaction; record.error = null; return structuredClone(record);
  }
  async fail(input: { merchantId: string; resourceId: string; paymentIdentifier: string; status: "failed" | "reconciliation_required"; error: string }) {
    const record = this.require(input); if (!["delivered", "settled"].includes(record.status)) { record.status = input.status; record.error = input.error; } return structuredClone(record);
  }
  async deliver(input: { merchantId: string; resourceId: string; paymentIdentifier: string; body: unknown; bodyHash: string }) {
    const record = this.require(input); if (record.status === "delivered") { if (record.delivery?.bodyHash !== input.bodyHash) throw new Error("merchant_x402_delivery_conflict"); return { record: structuredClone(record), replayed: true }; }
    if (record.status !== "settled") throw new Error("merchant_x402_delivery_not_allowed"); record.status = "delivered"; record.delivery = { body: input.body, bodyHash: input.bodyHash }; return { record: structuredClone(record), replayed: false };
  }
  private require(input: { merchantId: string; resourceId: string; paymentIdentifier: string }) { const record = this.records.get(key(input)); if (!record) throw new Error("merchant_x402_payment_not_found"); return record; }
}