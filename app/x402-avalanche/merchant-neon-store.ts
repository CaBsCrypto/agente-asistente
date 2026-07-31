import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "@/db";
import type { PaymentPayload, PaymentRequirements, SettleResponse } from "@x402/core/types";
import type { AvalancheMerchantAuthorization } from "./merchant-protocol";
import type {
  AvalancheMerchantPaymentStore,
  MerchantPaymentRecord,
  MerchantPaymentStatus,
} from "./merchant-store";

type QueryResult<T> = { rows: T[] };
export type MerchantSqlClient = {
  query<T = Record<string, unknown>>(query: string, params?: unknown[]): Promise<QueryResult<T>>;
};
type MerchantRow = {
  merchant_id: string;
  resource_id: string;
  payment_identifier: string;
  fingerprint: string;
  signature_hash: string;
  authorization: AvalancheMerchantAuthorization;
  requirement: PaymentRequirements;
  payload: PaymentPayload;
  status: MerchantPaymentStatus;
  settlement: SettleResponse | null;
  transaction_hash: string | null;
  delivery_body: unknown | null;
  delivery_body_hash: string | null;
  error: string | null;
};

let schemaPromise: Promise<void> | null = null;
function defaultClient(): MerchantSqlClient {
  const url = getDatabaseUrl();
  if (!url) throw new Error("database_not_configured");
  return neon(url, { fullResults: true }) as unknown as MerchantSqlClient;
}
export async function ensureAvalancheMerchantSchema(sql: MerchantSqlClient = defaultClient()) {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await sql.query(`CREATE TABLE IF NOT EXISTS merchant_avalanche_x402_payments (
      merchant_id text NOT NULL,
      resource_id text NOT NULL,
      payment_identifier text NOT NULL,
      fingerprint text NOT NULL,
      signature_hash text NOT NULL UNIQUE,
      asset_contract text NOT NULL,
      payer text NOT NULL,
      authorization_nonce text NOT NULL,
      authorization jsonb NOT NULL,
      requirement jsonb NOT NULL,
      payload jsonb NOT NULL,
      status text NOT NULL DEFAULT 'verified',
      settlement jsonb,
      transaction_hash text UNIQUE,
      delivery_body jsonb,
      delivery_body_hash text,
      error text,
      settlement_claimed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (merchant_id, resource_id, payment_identifier),
      UNIQUE (asset_contract, payer, authorization_nonce)
    )`);
    await sql.query("CREATE INDEX IF NOT EXISTS merchant_avalanche_x402_status_idx ON merchant_avalanche_x402_payments(status, updated_at)");
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}
function mapRow(row: MerchantRow): MerchantPaymentRecord {
  return {
    merchantId: row.merchant_id,
    resourceId: row.resource_id,
    paymentIdentifier: row.payment_identifier,
    fingerprint: row.fingerprint,
    signatureHash: row.signature_hash,
    authorization: row.authorization,
    requirement: row.requirement,
    payload: row.payload,
    status: row.status,
    settlement: row.settlement,
    transactionHash: row.transaction_hash,
    delivery: row.delivery_body_hash
      ? { body: row.delivery_body, bodyHash: row.delivery_body_hash }
      : null,
    error: row.error,
  };
}
function keyParams(input: { merchantId: string; resourceId: string; paymentIdentifier: string }) {
  return [input.merchantId, input.resourceId, input.paymentIdentifier];
}
export class NeonAvalancheMerchantPaymentStore implements AvalancheMerchantPaymentStore {
  constructor(private readonly sql: MerchantSqlClient = defaultClient()) {}

  private async find(input: { merchantId: string; resourceId: string; paymentIdentifier: string }) {
    await ensureAvalancheMerchantSchema(this.sql);
    const result = await this.sql.query<MerchantRow>(`SELECT * FROM merchant_avalanche_x402_payments
      WHERE merchant_id=$1 AND resource_id=$2 AND payment_identifier=$3 LIMIT 1`, keyParams(input));
    if (!result.rows[0]) throw new Error("merchant_x402_payment_not_found");
    return mapRow(result.rows[0]);
  }

  async claim(input: Parameters<AvalancheMerchantPaymentStore["claim"]>[0]) {
    await ensureAvalancheMerchantSchema(this.sql);
    const inserted = await this.sql.query<MerchantRow>(`INSERT INTO merchant_avalanche_x402_payments (
      merchant_id,resource_id,payment_identifier,fingerprint,signature_hash,
      asset_contract,payer,authorization_nonce,authorization,requirement,payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb)
    ON CONFLICT DO NOTHING RETURNING *`, [
      input.resource.merchantId,
      input.resource.resourceId,
      input.paymentIdentifier,
      input.fingerprint,
      input.signatureHash,
      input.requirement.asset.toLowerCase(),
      input.authorization.from,
      input.authorization.nonce,
      JSON.stringify(input.authorization),
      JSON.stringify(input.requirement),
      JSON.stringify(input.payload),
    ]);
    if (inserted.rows[0]) return { record: mapRow(inserted.rows[0]), replayed: false };
    let existing: MerchantPaymentRecord;
    try {
      existing = await this.find({
        merchantId: input.resource.merchantId,
        resourceId: input.resource.resourceId,
        paymentIdentifier: input.paymentIdentifier,
      });
    } catch {
      throw new Error("merchant_x402_signature_or_nonce_replay");
    }
    if (
      existing.fingerprint !== input.fingerprint ||
      existing.signatureHash !== input.signatureHash ||
      existing.authorization.nonce !== input.authorization.nonce
    ) throw new Error("merchant_x402_idempotency_conflict");
    return { record: existing, replayed: true };
  }

  async beginSettlement(input: { merchantId: string; resourceId: string; paymentIdentifier: string }) {
    await ensureAvalancheMerchantSchema(this.sql);
    const result = await this.sql.query<MerchantRow>(`UPDATE merchant_avalanche_x402_payments
      SET status='settling', settlement_claimed_at=now(), updated_at=now()
      WHERE merchant_id=$1 AND resource_id=$2 AND payment_identifier=$3 AND status='verified'
      RETURNING *`, keyParams(input));
    if (result.rows[0]) return mapRow(result.rows[0]);
    const existing = await this.find(input);
    if (existing.status === "settling") throw new Error("merchant_x402_settlement_in_progress");
    if (["settled", "delivered"].includes(existing.status)) return existing;
    throw new Error(`merchant_x402_settlement_not_allowed:${existing.status}`);
  }

  async settle(input: { merchantId: string; resourceId: string; paymentIdentifier: string; settlement: SettleResponse }) {
    await ensureAvalancheMerchantSchema(this.sql);
    const result = await this.sql.query<MerchantRow>(`UPDATE merchant_avalanche_x402_payments
      SET status='settled', settlement=$4::jsonb, transaction_hash=$5, error=NULL, updated_at=now()
      WHERE merchant_id=$1 AND resource_id=$2 AND payment_identifier=$3 AND status='settling'
      RETURNING *`, [...keyParams(input), JSON.stringify(input.settlement), input.settlement.transaction]);
    if (!result.rows[0]) throw new Error("merchant_x402_settlement_state_conflict");
    return mapRow(result.rows[0]);
  }

  async fail(input: { merchantId: string; resourceId: string; paymentIdentifier: string; status: "failed" | "reconciliation_required"; error: string }) {
    await ensureAvalancheMerchantSchema(this.sql);
    const result = await this.sql.query<MerchantRow>(`UPDATE merchant_avalanche_x402_payments
      SET status=$4, error=$5, updated_at=now()
      WHERE merchant_id=$1 AND resource_id=$2 AND payment_identifier=$3
        AND status IN ('verified','settling') RETURNING *`, [...keyParams(input), input.status, input.error]);
    return result.rows[0] ? mapRow(result.rows[0]) : this.find(input);
  }

  async deliver(input: { merchantId: string; resourceId: string; paymentIdentifier: string; body: unknown; bodyHash: string }) {
    await ensureAvalancheMerchantSchema(this.sql);
    const result = await this.sql.query<MerchantRow>(`UPDATE merchant_avalanche_x402_payments
      SET status='delivered', delivery_body=$4::jsonb, delivery_body_hash=$5, updated_at=now()
      WHERE merchant_id=$1 AND resource_id=$2 AND payment_identifier=$3 AND status='settled'
      RETURNING *`, [...keyParams(input), JSON.stringify(input.body), input.bodyHash]);
    if (result.rows[0]) return { record: mapRow(result.rows[0]), replayed: false };
    const existing = await this.find(input);
    if (existing.status !== "delivered") throw new Error("merchant_x402_delivery_not_allowed");
    if (existing.delivery?.bodyHash !== input.bodyHash) throw new Error("merchant_x402_delivery_conflict");
    return { record: existing, replayed: true };
  }
}