import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isValidStellarAddress } from "../app/privy-stellar";
import {
  X402_DEMO_LIMIT_DISPLAY,
} from "../app/x402/assets";
import { INTERNAL_TESTNET_USDC_DRIP } from "../app/x402/testnet-faucet";

type Stage = "start" | "fund-usdc" | "verify";
type JsonObject = Record<string, unknown>;
type AcceptanceState = {
  version: 1;
  baseUrl: string;
  startedAt: string;
  walletAddress: string;
  primaryWalletAddress: string;
  accountExistedBefore: boolean;
  trustlineBefore: boolean;
  usdcBalanceBefore: number;
  recentPaymentIdsBefore: string[];
  friendbotPerformed: boolean;
  xlmAfterFriendbot: number;
  faucetTransactionHash?: string;
  usdcAfterFaucet?: number;
};

const stage = (process.argv[2] ?? "") as Stage;
if (!(["start", "fund-usdc", "verify"] as string[]).includes(stage)) {
  throw new Error("usage: second-user-acceptance.ts <start|fund-usdc|verify>");
}

const baseUrl = (
  process.env.AGENT_ACCEPTANCE_BASE_URL ??
  "https://agente-asistente.vercel.app"
).replace(/\/$/, "");
const token = process.env.AGENT_ACCEPTANCE_PRIVY_TOKEN?.trim() ?? "";
const primaryWallet = process.env.AGENT_ACCEPTANCE_PRIMARY_WALLET?.trim() ?? "";
const statePath = resolve(
  process.env.SECOND_USER_ACCEPTANCE_STATE ??
  "outputs/second-user-acceptance.json",
);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function object(value: unknown, label: string): JsonObject {
  invariant(Boolean(value) && typeof value === "object" && !Array.isArray(value), `${label}_invalid`);
  return value as JsonObject;
}

function string(value: unknown, label: string) {
  invariant(typeof value === "string" && value.length > 0, `${label}_missing`);
  return value;
}

function number(value: unknown, label: string) {
  const parsed = Number(value);
  invariant(Number.isFinite(parsed), `${label}_invalid`);
  return parsed;
}

async function request(path: string, body?: JsonObject) {
  invariant(token.length > 0, "AGENT_ACCEPTANCE_PRIVY_TOKEN_required");
  const response = await fetch(baseUrl + path, {
    method: body ? "POST" : "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`http_${response.status}:${JSON.stringify(payload).slice(0, 240)}`);
  }
  return object(payload, path.replace(/\W+/g, "_"));
}

function mutationAcknowledged() {
  invariant(
    process.env.ACCEPT_TESTNET_MUTATIONS === "I_UNDERSTAND_TESTNET_ONLY",
    "Set ACCEPT_TESTNET_MUTATIONS=I_UNDERSTAND_TESTNET_ONLY",
  );
  const origin = new URL(baseUrl);
  invariant(
    origin.hostname === "agente-asistente.vercel.app" || origin.hostname === "localhost",
    "acceptance_base_url_not_allowlisted",
  );
}

function writeState(state: AcceptanceState) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
}

function readState() {
  const state = JSON.parse(readFileSync(statePath, "utf8")) as AcceptanceState;
  invariant(state.version === 1, "second_user_state_version_invalid");
  invariant(state.baseUrl === baseUrl, "second_user_state_base_url_changed");
  return state;
}

function x402Snapshot(payload: JsonObject) {
  const wallet = object(payload.wallet, "x402_wallet");
  const usdc = object(payload.x402Usdc, "x402_usdc");
  const recent = Array.isArray(payload.recent)
    ? payload.recent.map((entry) => object(entry, "x402_recent"))
    : [];
  return {
    walletAddress: string(wallet.address, "x402_wallet_address"),
    accountExists: wallet.exists === true,
    trustlineActive: usdc.trustlineActive === true,
    balance: number(usdc.balance ?? 0, "x402_usdc_balance"),
    recent,
  };
}

async function bootstrap() {
  const payload = await request("/api/agent/bootstrap", {});
  const wallet = object(payload.wallet, "bootstrap_wallet");
  const account = object(payload.account, "bootstrap_account");
  const balances = Array.isArray(account.balances)
    ? account.balances.map((entry) => object(entry, "bootstrap_balance"))
    : [];
  const xlm = balances.find((entry) => entry.asset === "XLM");
  return {
    walletAddress: string(wallet.address, "bootstrap_wallet_address"),
    accountExists: account.exists === true,
    xlmBalance: number(xlm?.balance ?? 0, "bootstrap_xlm_balance"),
  };
}

if (stage === "start") {
  mutationAcknowledged();
  invariant(isValidStellarAddress(primaryWallet), "AGENT_ACCEPTANCE_PRIMARY_WALLET_required");
  const beforeBootstrap = await bootstrap();
  invariant(isValidStellarAddress(beforeBootstrap.walletAddress), "second_user_wallet_invalid");
  invariant(beforeBootstrap.walletAddress !== primaryWallet, "second_user_wallet_matches_primary");
  const before = x402Snapshot(await request("/api/agent/x402"));
  invariant(before.walletAddress === beforeBootstrap.walletAddress, "second_user_wallet_binding_mismatch");
  invariant(!before.accountExists, "second_user_account_already_activated_use_fresh_email");
  invariant(!before.trustlineActive, "second_user_trustline_already_exists_use_fresh_email");
  invariant(before.balance === 0, "second_user_usdc_not_zero_use_fresh_email");
  invariant(before.recent.length === 0, "second_user_payments_already_exist_use_fresh_email");

  const state: AcceptanceState = {
    version: 1,
    baseUrl,
    startedAt: new Date().toISOString(),
    walletAddress: before.walletAddress,
    primaryWalletAddress: primaryWallet,
    accountExistedBefore: false,
    trustlineBefore: false,
    usdcBalanceBefore: before.balance,
    recentPaymentIdsBefore: [],
    friendbotPerformed: false,
    xlmAfterFriendbot: 0,
  };
  writeState(state);

  await request("/api/agent/chat", {
    message: "Recarga mi wallet con XLM de Testnet",
  });
  const afterFriendbot = await bootstrap();
  invariant(afterFriendbot.walletAddress === state.walletAddress, "wallet_changed_after_friendbot");
  invariant(afterFriendbot.accountExists, "friendbot_did_not_activate_account");
  invariant(afterFriendbot.xlmBalance > 0, "friendbot_xlm_missing");
  state.friendbotPerformed = true;
  state.xlmAfterFriendbot = afterFriendbot.xlmBalance;
  writeState(state);

  console.log(JSON.stringify({
    stage,
    passed: true,
    walletAddress: state.walletAddress,
    distinctFromPrimary: true,
    friendbot: { activated: true, xlmBalance: state.xlmAfterFriendbot },
    humanActionRequired: [
      "Return to the same second-user browser session.",
      "Ask: Prepare the x402 Testnet payment.",
      "Create the x402 USDC trustline and approve its Privy signature.",
      "Then run acceptance:second-user:fund-usdc with a fresh temporary token if needed.",
    ],
    statePath,
  }, null, 2));
}

if (stage === "fund-usdc") {
  mutationAcknowledged();
  const state = readState();
  const snapshot = x402Snapshot(await request("/api/agent/x402"));
  invariant(snapshot.walletAddress === state.walletAddress, "second_user_identity_changed");
  invariant(snapshot.accountExists, "second_user_account_not_active");
  invariant(snapshot.trustlineActive, "human_privy_trustline_signature_required");
  invariant(snapshot.balance < Number(INTERNAL_TESTNET_USDC_DRIP), "second_user_already_funded");

  const claim = await request("/api/agent/x402", { action: "claim_testnet_usdc" });
  const claimRecord = object(claim.claim, "faucet_claim");
  const transactionHash = string(claimRecord.transactionHash, "faucet_transaction_hash");
  invariant(/^[0-9a-f]{64}$/i.test(transactionHash), "faucet_transaction_hash_invalid");

  const funded = x402Snapshot(await request("/api/agent/x402"));
  invariant(funded.walletAddress === state.walletAddress, "second_user_identity_changed_after_faucet");
  invariant(
    funded.balance >= Number(INTERNAL_TESTNET_USDC_DRIP),
    "second_user_faucet_balance_missing",
  );
  state.faucetTransactionHash = transactionHash;
  state.usdcAfterFaucet = funded.balance;
  writeState(state);

  console.log(JSON.stringify({
    stage,
    passed: true,
    walletAddress: state.walletAddress,
    faucet: {
      amount: INTERNAL_TESTNET_USDC_DRIP,
      balance: funded.balance,
      transactionHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${transactionHash}`,
    },
    humanActionRequired: [
      "Return to the same second-user browser session.",
      "Prepare the 0.01 USDC x402 purchase.",
      "Review amount, asset, network and destination.",
      "Approve the transaction-specific Privy signature once.",
      "Then run acceptance:second-user:verify.",
    ],
    statePath,
  }, null, 2));
}

if (stage === "verify") {
  const state = readState();
  invariant(state.friendbotPerformed, "friendbot_stage_not_recorded");
  invariant(Boolean(state.faucetTransactionHash), "faucet_stage_not_recorded");
  invariant(typeof state.usdcAfterFaucet === "number", "faucet_balance_not_recorded");

  const snapshot = x402Snapshot(await request("/api/agent/x402"));
  invariant(snapshot.walletAddress === state.walletAddress, "second_user_identity_changed");
  invariant(snapshot.accountExists, "second_user_account_not_active");
  invariant(snapshot.trustlineActive, "second_user_trustline_missing");

  const newConfirmed = snapshot.recent.filter((payment) =>
    payment.status === "confirmed" &&
    !state.recentPaymentIdsBefore.includes(String(payment.id ?? "")),
  );
  invariant(newConfirmed.length === 1, "expected_exactly_one_new_confirmed_payment");
  const payment = newConfirmed[0];
  invariant(String(payment.amount) === X402_DEMO_LIMIT_DISPLAY, "x402_amount_changed");
  const transactionHash = string(payment.transactionHash, "x402_transaction_hash");
  invariant(/^[0-9a-f]{64}$/i.test(transactionHash), "x402_transaction_hash_invalid");
  invariant(
    typeof payment.resourcePreview === "string" && payment.resourcePreview.length > 0,
    "x402_resource_not_delivered",
  );

  const expectedFinal = Number(state.usdcAfterFaucet) - Number(X402_DEMO_LIMIT_DISPLAY);
  invariant(
    Math.abs(snapshot.balance - expectedFinal) < 0.0000001,
    `second_user_final_balance_mismatch_expected_${expectedFinal.toFixed(7)}`,
  );

  const horizonResponse = await fetch(
    `https://horizon-testnet.stellar.org/transactions/${transactionHash}`,
    { signal: AbortSignal.timeout(20_000) },
  );
  const horizon: unknown = await horizonResponse.json().catch(() => null);
  invariant(horizonResponse.ok, "x402_horizon_receipt_missing");
  invariant(object(horizon, "x402_horizon").successful === true, "x402_horizon_not_successful");

  console.log(JSON.stringify({
    stage,
    passed: true,
    walletAddress: state.walletAddress,
    proof: {
      distinctWallet: state.walletAddress !== state.primaryWalletAddress,
      friendbotTransition: !state.accountExistedBefore && state.friendbotPerformed,
      trustlineTransition: !state.trustlineBefore && snapshot.trustlineActive,
      faucetAmount: INTERNAL_TESTNET_USDC_DRIP,
      paymentAmount: X402_DEMO_LIMIT_DISPLAY,
      finalUsdcBalance: snapshot.balance.toFixed(7),
      resourceDelivered: true,
      transactionHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${transactionHash}`,
    },
    humanIntervention: [
      "Email/Google login and any OTP.",
      "Privy signature for the USDC trustline.",
      "Review and Privy signature for the 0.01 USDC payment.",
    ],
  }, null, 2));
}
