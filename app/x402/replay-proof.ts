const STELLAR_AMOUNT_SCALE = 7;

export type X402ReplayPayment = {
  id: string;
  network: string;
  amount: string;
  status: string;
  transactionHash: string | null;
  resourcePreview?: string | null;
};

export type X402ExecutionResult = {
  replayed: boolean;
  payment: X402ReplayPayment;
};

export type X402ReplayProof = {
  paymentId: string;
  network: "stellar:testnet";
  transactionHash: string;
  amount: string;
  balanceBefore: string;
  balanceAfterFirst: string;
  balanceAfterReplay: string;
  firstDebitAtomic: string;
  replayDebitAtomic: "0";
  replayed: true;
  duplicatePrevented: true;
};

export type X402ConfirmedReplayProof = {
  paymentId: string;
  network: "stellar:testnet";
  transactionHash: string;
  balanceBefore: string;
  balanceAfterReplay: string;
  replayDebitAtomic: "0";
  replayed: true;
  duplicatePrevented: true;
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function stellarAmountToAtomic(value: string) {
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(value);
  if (!match) throw new Error("invalid_stellar_amount");
  const fraction = (match[2] ?? "").padEnd(STELLAR_AMOUNT_SCALE, "0");
  return BigInt(match[1]) * BigInt(10) ** BigInt(STELLAR_AMOUNT_SCALE) + BigInt(fraction);
}

function confirmedPayment(result: X402ExecutionResult, paymentId: string) {
  invariant(result.payment.id === paymentId, "x402_replay_payment_id_changed");
  invariant(result.payment.network === "stellar:testnet", "x402_replay_network_not_testnet");
  invariant(result.payment.status === "confirmed", "x402_replay_payment_not_confirmed");
  invariant(Boolean(result.payment.transactionHash), "x402_replay_transaction_hash_missing");
  return result.payment as X402ReplayPayment & { transactionHash: string };
}

export async function proveX402FirstExecutionAndReplay(input: {
  paymentId: string;
  readUsdcBalance: () => Promise<string>;
  executeSameApproval: () => Promise<X402ExecutionResult>;
}) {
  const balanceBefore = await input.readUsdcBalance();
  const first = await input.executeSameApproval();
  invariant(first.replayed === false, "x402_first_execution_was_already_replayed");
  const firstPayment = confirmedPayment(first, input.paymentId);
  invariant(
    typeof firstPayment.resourcePreview === "string" && firstPayment.resourcePreview.length > 0,
    "x402_first_execution_resource_not_delivered",
  );
  const balanceAfterFirst = await input.readUsdcBalance();
  const amountAtomic = stellarAmountToAtomic(firstPayment.amount);
  const firstDebitAtomic =
    stellarAmountToAtomic(balanceBefore) - stellarAmountToAtomic(balanceAfterFirst);
  invariant(firstDebitAtomic === amountAtomic, "x402_first_execution_debit_mismatch");

  const replay = await input.executeSameApproval();
  invariant(replay.replayed === true, "x402_replay_flag_missing");
  const replayPayment = confirmedPayment(replay, input.paymentId);
  invariant(
    replayPayment.transactionHash === firstPayment.transactionHash,
    "x402_replay_transaction_hash_changed",
  );
  const balanceAfterReplay = await input.readUsdcBalance();
  const replayDebitAtomic =
    stellarAmountToAtomic(balanceAfterFirst) - stellarAmountToAtomic(balanceAfterReplay);
  invariant(replayDebitAtomic === BigInt(0), "x402_replay_balance_changed");

  return {
    paymentId: input.paymentId,
    network: "stellar:testnet",
    transactionHash: firstPayment.transactionHash,
    amount: firstPayment.amount,
    balanceBefore,
    balanceAfterFirst,
    balanceAfterReplay,
    firstDebitAtomic: firstDebitAtomic.toString(),
    replayDebitAtomic: "0",
    replayed: true,
    duplicatePrevented: true,
  } satisfies X402ReplayProof;
}

export async function proveX402ConfirmedReplay(input: {
  paymentId: string;
  expectedTransactionHash: string;
  readUsdcBalance: () => Promise<string>;
  replayConfirmedPayment: () => Promise<X402ExecutionResult>;
}) {
  const balanceBefore = await input.readUsdcBalance();
  const replay = await input.replayConfirmedPayment();
  invariant(replay.replayed === true, "x402_replay_flag_missing");
  const payment = confirmedPayment(replay, input.paymentId);
  invariant(
    payment.transactionHash === input.expectedTransactionHash,
    "x402_replay_transaction_hash_changed",
  );
  const balanceAfterReplay = await input.readUsdcBalance();
  invariant(
    stellarAmountToAtomic(balanceBefore) === stellarAmountToAtomic(balanceAfterReplay),
    "x402_replay_balance_changed",
  );

  return {
    paymentId: input.paymentId,
    network: "stellar:testnet",
    transactionHash: payment.transactionHash,
    balanceBefore,
    balanceAfterReplay,
    replayDebitAtomic: "0",
    replayed: true,
    duplicatePrevented: true,
  } satisfies X402ConfirmedReplayProof;
}
