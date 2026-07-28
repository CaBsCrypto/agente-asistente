import { createHash } from "node:crypto";
import { assertAvalancheX402Localhost } from "./config";

export const AVALANCHE_REPORT_PATH = "/api/demo/avalanche-report";
export const AVALANCHE_REPORT_REQUEST = {
  report: "avalanche-agent-readiness",
  version: 1,
} as const;

export function avalancheReportBodyHash() {
  return createHash("sha256")
    .update(JSON.stringify(AVALANCHE_REPORT_REQUEST))
    .digest("hex");
}

export function avalancheReportUrl(origin: string) {
  const url = new URL(AVALANCHE_REPORT_PATH, origin);
  assertAvalancheX402Localhost(url.toString());
  return url.toString();
}
