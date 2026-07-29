import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "@/db";
import type { CctpEvmPreview } from "@/app/cctp/evm";

export type CctpTransferStatus =
  | "draft"
  | "approve_prepared"
  | "approve_submitted"
  | "approve_confirmed"
  | "burn_prepared"
  | "burn_submitted"
  | "attesting"
  | "mint_prepared"
  | "mint_submitted"
  | "completed"
  | "reconciliation_required"
  | "failed";

export type CctpTransferRow = {
  id: string;
  user_id: string;
  idempotency_key: string;
  source_wallet_id: string;
  source_address: string;
  destination_wallet_id: string;
  destination_address: string;
  amount_atomic: string;
  plan: Record<string, unknown>;
  status: CctpTransferStatus;
  evm_preview: CctpEvmPreview | null;
  approve_tx_hash: string | null;
  burn_tx_hash: string | null;
  attestation: { message: `0x${string}`; attestation: `0x${string}` } | null;
  mint_xdr: string | null;
  mint_signing_hash: string | null;
  mint_signed_xdr: string | null;
  mint_expected_hash: string | null;
  mint_tx_hash: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type QueryResult<T> = { rows: T[] };
export type CctpSqlClient = {
  query<T = Record<string, unknown>>(
    query: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
};

let schemaPromise: Promise<void> | null = null;

function client(): CctpSqlClient {
  const url = getDatabaseUrl();
  if (!url) throw new Error("database_not_configured");
  return neon(url, { fullResults: true }) as unknown as CctpSqlClient;
}

export async function ensureCctpSchema(sql: CctpSqlClient = client()) {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await sql.query(`CREATE TABLE IF NOT EXISTS agent_cctp_transfers (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES agent_users(id) ON DELETE CASCADE,
      idempotency_key text NOT NULL UNIQUE,
      source_wallet_id text NOT NULL,
      source_address text NOT NULL,
      destination_wallet_id text NOT NULL,
      destination_address text NOT NULL,
      amount_atomic numeric(30,0) NOT NULL,
      plan jsonb NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      evm_preview jsonb,
      approve_tx_hash text UNIQUE,
      burn_tx_hash text UNIQUE,
      attestation jsonb,
      mint_xdr text,
      mint_signing_hash text,
      mint_signed_xdr text,
      mint_expected_hash text,
      mint_tx_hash text UNIQUE,
      error text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await sql.query(
      "ALTER TABLE agent_cctp_transfers ADD COLUMN IF NOT EXISTS mint_signed_xdr text, ADD COLUMN IF NOT EXISTS mint_expected_hash text",
    );
    await sql.query(
      "CREATE INDEX IF NOT EXISTS agent_cctp_user_created_idx ON agent_cctp_transfers(user_id, created_at)",
    );
    await sql.query(
      "CREATE INDEX IF NOT EXISTS agent_cctp_status_idx ON agent_cctp_transfers(status)",
    );
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) =>
    `${JSON.stringify(key)}:${stableJson(object[key])}`
  ).join(",")}}`;
}

export async function findCctpTransfer(
  userId: string,
  transferId: string,
  sql: CctpSqlClient = client(),
) {
  await ensureCctpSchema(sql);
  const result = await sql.query<CctpTransferRow>(
    "SELECT * FROM agent_cctp_transfers WHERE id=$1 AND user_id=$2 LIMIT 1",
    [transferId, userId],
  );
  if (!result.rows[0]) throw new Error("cctp_transfer_not_found");
  return result.rows[0];
}

export async function prepareCctpTransfer(input: {
  userId: string;
  requestId: string;
  sourceWalletId: string;
  sourceAddress: string;
  destinationWalletId: string;
  destinationAddress: string;
  amountAtomic: string;
  plan: Record<string, unknown>;
}, sql: CctpSqlClient = client()) {
  await ensureCctpSchema(sql);
  const idempotencyKey = createHash("sha256")
    .update(`cctp:${input.userId}:${input.requestId}`)
    .digest("hex");
  const id = `cctp_${randomUUID()}`;
  const inserted = await sql.query<CctpTransferRow>(`INSERT INTO agent_cctp_transfers (
    id,user_id,idempotency_key,source_wallet_id,source_address,
    destination_wallet_id,destination_address,amount_atomic,plan
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
  ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`, [
    id,
    input.userId,
    idempotencyKey,
    input.sourceWalletId,
    input.sourceAddress,
    input.destinationWalletId,
    input.destinationAddress,
    input.amountAtomic,
    JSON.stringify(input.plan),
  ]);
  if (inserted.rows[0]) return { row: inserted.rows[0], replayed: false };
  const existing = await sql.query<CctpTransferRow>(
    "SELECT * FROM agent_cctp_transfers WHERE idempotency_key=$1 LIMIT 1",
    [idempotencyKey],
  );
  const row = existing.rows[0];
  if (!row) throw new Error("cctp_prepare_race");
  if (
    row.user_id !== input.userId ||
    row.source_wallet_id !== input.sourceWalletId ||
    row.source_address.toLowerCase() !== input.sourceAddress.toLowerCase() ||
    row.destination_wallet_id !== input.destinationWalletId ||
    row.destination_address !== input.destinationAddress ||
    row.amount_atomic !== input.amountAtomic ||
    stableJson(row.plan) !== stableJson(input.plan)
  ) throw new Error("cctp_idempotency_conflict");
  return { row, replayed: true };
}

export async function saveCctpEvmPreview(input: {
  userId: string;
  transferId: string;
  preview: CctpEvmPreview;
}, sql: CctpSqlClient = client()) {
  const expected = input.preview.kind === "approve"
    ? ["draft"]
    : ["draft", "approve_confirmed"];
  const next = input.preview.kind === "approve" ? "approve_prepared" : "burn_prepared";
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET evm_preview=$1::jsonb,status=$2,error=NULL,updated_at=now()
    WHERE id=$3 AND user_id=$4 AND status = ANY($5::text[]) RETURNING *`, [
    JSON.stringify(input.preview), next, input.transferId, input.userId, expected,
  ]);
  if (result.rows[0]) return result.rows[0];
  const row = await findCctpTransfer(input.userId, input.transferId, sql);
  if (
    row.status === next &&
    stableJson(row.evm_preview) === stableJson(input.preview)
  ) return row;
  throw new Error(`cctp_${input.preview.kind}_prepare_not_allowed:${row.status}`);
}

export async function refreshCctpEvmPreview(input: {
  userId: string;
  transferId: string;
  preview: CctpEvmPreview;
}, sql: CctpSqlClient = client()) {
  const status = `${input.preview.kind}_prepared`;
  const hashColumn = input.preview.kind === "approve"
    ? "approve_tx_hash"
    : "burn_tx_hash";
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET evm_preview=$1::jsonb,error=NULL,updated_at=now()
    WHERE id=$2 AND user_id=$3 AND status=$4 AND ${hashColumn} IS NULL
    RETURNING *`, [
    JSON.stringify(input.preview),
    input.transferId,
    input.userId,
    status,
  ]);
  if (result.rows[0]) return result.rows[0];
  const row = await findCctpTransfer(input.userId, input.transferId, sql);
  if (row.status !== status) {
    throw new Error(`cctp_${input.preview.kind}_refresh_not_allowed:${row.status}`);
  }
  if (row[hashColumn]) {
    throw new Error(`cctp_${input.preview.kind}_refresh_after_broadcast_rejected`);
  }
  throw new Error(`cctp_${input.preview.kind}_refresh_failed`);
}

export async function bindCctpEvmHash(input: {
  userId: string;
  transferId: string;
  kind: "approve" | "burn";
  transactionHash: string;
}, sql: CctpSqlClient = client()) {
  const expected = `${input.kind}_prepared`;
  const next = `${input.kind}_submitted`;
  const column = input.kind === "approve" ? "approve_tx_hash" : "burn_tx_hash";
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET ${column}=$1,status=$2,updated_at=now()
    WHERE id=$3 AND user_id=$4 AND status=$5 AND ${column} IS NULL
    RETURNING *`, [
    input.transactionHash.toLowerCase(),
    next,
    input.transferId,
    input.userId,
    expected,
  ]);
  if (result.rows[0]) return result.rows[0];
  const row = await findCctpTransfer(input.userId, input.transferId, sql);
  if (
    row.status === next &&
    row[column] === input.transactionHash.toLowerCase()
  ) return row;
  throw new Error(`cctp_${input.kind}_hash_replacement_rejected`);
}

export async function confirmCctpEvm(input: {
  userId: string;
  transferId: string;
  kind: "approve" | "burn";
}, sql: CctpSqlClient = client()) {
  const expected = `${input.kind}_submitted`;
  const next = input.kind === "approve" ? "approve_confirmed" : "attesting";
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET status=$1,error=NULL,updated_at=now()
    WHERE id=$2 AND user_id=$3 AND status=$4 RETURNING *`, [
    next, input.transferId, input.userId, expected,
  ]);
  if (!result.rows[0]) {
    const row = await findCctpTransfer(input.userId, input.transferId, sql);
    if (row.status === next) return row;
    throw new Error(`cctp_${input.kind}_confirmation_state_conflict`);
  }
  return result.rows[0];
}

export async function saveCctpAttestation(input: {
  userId: string;
  transferId: string;
  message: `0x${string}`;
  attestation: `0x${string}`;
}, sql: CctpSqlClient = client()) {
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET attestation=$1::jsonb,status='attesting',error=NULL,updated_at=now()
    WHERE id=$2 AND user_id=$3 AND status='attesting' AND attestation IS NULL
    RETURNING *`, [
    JSON.stringify({ message: input.message, attestation: input.attestation }),
    input.transferId,
    input.userId,
  ]);
  if (result.rows[0]) return result.rows[0];
  const row = await findCctpTransfer(input.userId, input.transferId, sql);
  if (
    row.attestation?.message === input.message &&
    row.attestation?.attestation === input.attestation
  ) return row;
  throw new Error("cctp_attestation_replacement_rejected");
}

export async function saveCctpMintPreview(input: {
  userId: string;
  transferId: string;
  xdr: string;
  signingHash: string;
}, sql: CctpSqlClient = client()) {
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET mint_xdr=$1,mint_signing_hash=$2,status='mint_prepared',updated_at=now()
    WHERE id=$3 AND user_id=$4 AND status='attesting' AND attestation IS NOT NULL
    RETURNING *`, [
    input.xdr, input.signingHash, input.transferId, input.userId,
  ]);
  if (result.rows[0]) return result.rows[0];
  const row = await findCctpTransfer(input.userId, input.transferId, sql);
  if (
    row.status === "mint_prepared" &&
    row.mint_xdr === input.xdr &&
    row.mint_signing_hash === input.signingHash
  ) return row;
  throw new Error(`cctp_mint_prepare_not_allowed:${row.status}`);
}

export async function stageCctpMintSubmission(input: {
  userId: string;
  transferId: string;
  signedXdr: string;
  expectedHash: string;
}, sql: CctpSqlClient = client()) {
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET mint_signed_xdr=$1,mint_expected_hash=$2,status='mint_submitted',updated_at=now()
    WHERE id=$3 AND user_id=$4 AND status='mint_prepared'
      AND mint_signed_xdr IS NULL AND mint_expected_hash IS NULL
    RETURNING *`, [
    input.signedXdr, input.expectedHash, input.transferId, input.userId,
  ]);
  if (result.rows[0]) return result.rows[0];
  const row = await findCctpTransfer(input.userId, input.transferId, sql);
  if (
    row.status === "mint_submitted" &&
    row.mint_signed_xdr === input.signedXdr &&
    row.mint_expected_hash === input.expectedHash
  ) {
    return row;
  }
  if (row.status === "completed") return row;
  if (row.status === "mint_submitted") {
    throw new Error("cctp_mint_payload_replacement_rejected");
  }
  throw new Error(`cctp_mint_stage_not_allowed:${row.status}`);
}

export async function completeCctpMint(input: {
  userId: string;
  transferId: string;
  transactionHash: string;
}, sql: CctpSqlClient = client()) {
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET mint_tx_hash=$1,status='completed',error=NULL,updated_at=now()
    WHERE id=$2 AND user_id=$3 AND status='mint_submitted' RETURNING *`, [
    input.transactionHash, input.transferId, input.userId,
  ]);
  if (!result.rows[0]) throw new Error("cctp_mint_completion_state_conflict");
  return result.rows[0];
}

export async function quarantineCctpTransfer(input: {
  userId: string;
  transferId: string;
  error: string;
}, sql: CctpSqlClient = client()) {
  const result = await sql.query<CctpTransferRow>(`UPDATE agent_cctp_transfers
    SET status='reconciliation_required',error=$1,updated_at=now()
    WHERE id=$2 AND user_id=$3 AND status NOT IN ('completed','failed')
    RETURNING *`, [input.error, input.transferId, input.userId]);
  return result.rows[0] ?? findCctpTransfer(input.userId, input.transferId, sql);
}
