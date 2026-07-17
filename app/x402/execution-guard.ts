export type X402ExecutionGuard =
  | { action: "execute" }
  | { action: "replay" }
  | { action: "reject"; error: string };

export function guardX402Execution(status: string): X402ExecutionGuard {
  switch (status) {
    case "prepared":
      return { action: "execute" };
    case "confirmed":
      return { action: "replay" };
    case "signing":
    case "reconciliation_required":
      return {
        action: "reject",
        error: "x402_payment_reconciliation_required",
      };
    case "failed":
      return {
        action: "reject",
        error: "x402_payment_failed_requires_new_review",
      };
    default:
      return {
        action: "reject",
        error: "x402_payment_invalid_status",
      };
  }
}
