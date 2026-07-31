import { createHash } from "node:crypto";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { NextResponse } from "next/server";
import { getAvalancheX402MerchantDemoConfig } from "@/app/x402-avalanche/config";
import { createAvalancheX402Facilitator } from "@/app/x402-avalanche/facilitator";
import {
  deliverAvalancheMerchantResource,
  processAvalancheMerchantPayment,
} from "@/app/x402-avalanche/merchant";
import { NeonAvalancheMerchantPaymentStore } from "@/app/x402-avalanche/merchant-neon-store";
import {
  defineAvalancheMerchantResource,
  merchantRequestBodyHash,
} from "@/app/x402-avalanche/merchant-protocol";
import {
  createAvalancheMerchantReceiptVerifier,
  createFujiJsonRpcReceiptReader,
} from "@/app/x402-avalanche/merchant-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 16 * 1024;
const ROUTE_PATH = "/api/demo/merchant/avalanche-report";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "PAYMENT-SIGNATURE",
  "X-Content-Type-Options": "nosniff",
};
function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "merchant_x402_request_failed";
  return /^[a-z0-9_.:-]{1,180}$/i.test(message)
    ? message
    : "merchant_x402_request_failed";
}
function errorStatus(message: string) {
  if (message.includes("not_configured") || message.includes("config_required")) return 503;
  if (message.includes("in_progress") || message.includes("conflict") || message.includes("replay")) return 409;
  if (message.includes("too_large")) return 413;
  return 400;
}
function deliveryBody(input: { paymentIdentifier: string; transactionHash: string }) {
  const deliveryId = `merchant_delivery_${createHash("sha256").update(input.paymentIdentifier).digest("hex").slice(0, 24)}`;
  return {
    deliveryId,
    product: "Avalanche agent commerce readiness report",
    network: "eip155:43113",
    paid: { asset: "USDC", amountAtomic: "10000", decimals: 6 },
    paymentIdentifier: input.paymentIdentifier,
    transactionHash: input.transactionHash,
    findings: [
      "Wallet authorization verified with EIP-3009",
      "Payment settled on Avalanche Fuji",
      "Delivery is idempotent and bound to this payment identifier",
    ],
  };
}

export async function POST(request: Request) {
  try {
    const config = getAvalancheX402MerchantDemoConfig();
    if (!config.enabled || !config.payTo || !config.baseUrl) {
      return NextResponse.json({ error: config.reason }, { status: 503, headers: privateHeaders });
    }
    const rawBody = new Uint8Array(await request.arrayBuffer());
    if (rawBody.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "merchant_x402_request_body_too_large" }, { status: 413, headers: privateHeaders });
    }
    const resource = defineAvalancheMerchantResource({
      merchantId: "carmelita-demo",
      resourceId: "avalanche-readiness-report-v1",
      canonicalUrl: `${config.baseUrl}${ROUTE_PATH}`,
      description: "Carmelita Avalanche agent commerce readiness report",
      mimeType: "application/json",
      amountAtomic: "10000",
      payTo: config.payTo,
    });
    const store = new NeonAvalancheMerchantPaymentStore();
    const result = await processAvalancheMerchantPayment({
      paymentSignature: request.headers.get("payment-signature"),
      resource,
      bodyHash: merchantRequestBodyHash(rawBody),
      nowSeconds: Math.floor(Date.now() / 1_000),
      store,
      facilitator: createAvalancheX402Facilitator(),
      receiptVerifier: createAvalancheMerchantReceiptVerifier(
        createFujiJsonRpcReceiptReader(),
      ),
    });
    if (result.kind === "payment_required") {
      return NextResponse.json(decodePaymentRequiredHeader(result.paymentRequired), {
        status: 402,
        headers: { ...privateHeaders, "PAYMENT-REQUIRED": result.paymentRequired },
      });
    }
    if (result.kind !== "paid") {
      return NextResponse.json({ error: result.kind }, {
        status: result.status,
        headers: privateHeaders,
      });
    }
    const body = result.record.delivery?.body ?? deliveryBody({
      paymentIdentifier: result.record.paymentIdentifier,
      transactionHash: result.record.transactionHash!,
    });
    const delivery = result.record.status === "delivered"
      ? { record: result.record, replayed: true }
      : await deliverAvalancheMerchantResource({ store, record: result.record, body });
    return NextResponse.json(delivery.record.delivery?.body ?? body, {
      status: 200,
      headers: {
        ...privateHeaders,
        "PAYMENT-RESPONSE": result.paymentResponse,
        "X-Carmelita-Payment-Identifier": result.record.paymentIdentifier,
        "X-Carmelita-Delivery-SHA256": delivery.record.delivery!.bodyHash,
      },
    });
  } catch (error) {
    const message = safeMessage(error);
    return NextResponse.json({ error: message }, {
      status: errorStatus(message),
      headers: privateHeaders,
    });
  }
}