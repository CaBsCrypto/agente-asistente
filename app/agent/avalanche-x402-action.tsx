"use client";

import { useRef, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import type { Locale } from "@/app/language-toggle";
import {
  AVALANCHE_X402_CLIENT,
  avalancheX402SessionKey,
  canonicalAvalancheX402Delivery,
  validateAvalancheX402Delivery,
  validatePreparedAvalancheX402,
  type AvalancheX402Delivery,
  type PreparedAvalancheX402,
} from "./avalanche-x402-client";
// Namespace-imported so the settlement encoder is referenced only at the
// settle call site: the approved signature is always persisted first.
import * as x402Settlement from "./avalanche-x402-client";

export type AvalancheX402Action = {
  type: "avalanche.x402";
  network: "avalanche:fuji";
  requestId?: string;
};

type Receipt = {
  title: string;
  network: string;
  rows: { label: string; value: string }[];
  transactionHash: string | null;
  explorerUrl: string | null;
};

const copy = {
  en: {
    prepare: "Prepare 0.01 USDC payment", approve: "Approve in Privy and settle",
    working: "Working...", retry: "Retry settlement with the same signature",
    network: "Network", from: "From", to: "Recipient", amount: "Amount",
    resource: "Resource", expires: "Authorization expires", delivered: "Report delivered",
    deliveryId: "Delivery ID", transaction: "Settlement transaction",
    reused: "Reusing the signature you already approved for this payment.",
    banner: "HIGH RISK · ONE-TIME PAYMENT AUTHORIZATION",
  },
  es: {
    prepare: "Preparar pago de 0.01 USDC", approve: "Aprobar en Privy y liquidar",
    working: "Procesando...", retry: "Reintentar liquidación con la misma firma",
    network: "Red", from: "Desde", to: "Destinatario", amount: "Monto",
    resource: "Recurso", expires: "La autorización expira", delivered: "Reporte entregado",
    deliveryId: "ID de entrega", transaction: "Transacción de liquidación",
    reused: "Se reutiliza la firma que ya aprobaste para este pago.",
    banner: "ALTO RIESGO · AUTORIZACIÓN DE PAGO POR ÚNICA VEZ",
  },
  pt: {
    prepare: "Preparar pagamento de 0.01 USDC", approve: "Aprovar na Privy e liquidar",
    working: "Processando...", retry: "Tentar liquidação novamente com a mesma assinatura",
    network: "Rede", from: "Origem", to: "Destinatário", amount: "Valor",
    resource: "Recurso", expires: "A autorização expira", delivered: "Relatório entregue",
    deliveryId: "ID de entrega", transaction: "Transação de liquidação",
    reused: "Reutilizando a assinatura que você já aprovou para este pagamento.",
    banner: "ALTO RISCO · AUTORIZAÇÃO DE PAGAMENTO ÚNICA",
  },
};

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * One payment produces at most one Privy prompt. The approved signature is
 * cached per payment ID for the tab session, so a retry or reload settles the
 * same authorization instead of asking the user to sign again.
 */
function readStoredSignature(paymentId: string) {
  try {
    return sessionStorage.getItem(avalancheX402SessionKey(paymentId));
  } catch {
    return null;
  }
}

function storeSignature(paymentId: string, signature: string) {
  try {
    sessionStorage.setItem(avalancheX402SessionKey(paymentId), signature);
  } catch {
    // A blocked sessionStorage only costs a second approval prompt.
  }
}

function sameApprovalScope(
  previous: PreparedAvalancheX402,
  refreshed: PreparedAvalancheX402,
) {
  return previous.payment.walletAddress.toLowerCase() === refreshed.payment.walletAddress.toLowerCase() &&
    previous.payment.payTo.toLowerCase() === refreshed.payment.payTo.toLowerCase() &&
    previous.payment.network === refreshed.payment.network &&
    previous.payment.assetContract.toLowerCase() === refreshed.payment.assetContract.toLowerCase() &&
    previous.payment.amountAtomic === refreshed.payment.amountAtomic &&
    previous.payment.resourceUrl === refreshed.payment.resourceUrl;
}

export default function AvalancheX402Action({
  action,
  locale,
  getAccessToken,
  onReceipt,
}: {
  action: AvalancheX402Action;
  locale: Locale;
  getAccessToken: () => Promise<string | null>;
  onReceipt: (receipt: Receipt) => void;
}) {
  const t = copy[locale];
  const { wallets } = useWallets();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedAvalancheX402 | null>(null);
  const [delivery, setDelivery] = useState<AvalancheX402Delivery | null>(null);
  // The ref is the synchronous race guard; the state mirrors it for rendering.
  const settlementLock = useRef(false);
  const [locked, setLocked] = useState(false);

  async function authorization() {
    const token = await getAccessToken();
    if (!token) throw new Error("authentication_required");
    return `Bearer ${token}`;
  }

  async function prepare() {
    if (!action.requestId) throw new Error("invalid_avalanche_x402_action");
    const attemptHash = await sha256Hex(`${action.requestId}:${crypto.randomUUID()}`);
    const response = await fetch("/api/agent/avalanche/x402", {
      method: "POST",
      headers: {
        Authorization: await authorization(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "prepare", requestId: `attempt_${attemptHash}` }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "avalanche_x402_prepare_failed");
    const validated = validatePreparedAvalancheX402(body, window.location.origin);
    setPrepared(validated);
    if (readStoredSignature(validated.payment.id)) setNotice(t.reused);
    return validated;
  }

  async function signWithPrivy(current: PreparedAvalancheX402) {
    const stored = readStoredSignature(current.payment.id);
    if (stored) return stored;
    if (new Date(current.payment.expiresAt).getTime() <= Date.now()) {
      throw new Error("avalanche_x402_authorization_expired");
    }
    const wallet = wallets.find(
      (item) => item.walletClientType === "privy" &&
        item.address.toLowerCase() === current.payment.walletAddress.toLowerCase(),
    );
    if (!wallet) throw new Error("privy_evm_wallet_not_available_in_session");
    await wallet.switchChain(AVALANCHE_X402_CLIENT.chainId);
    const provider = await wallet.getEthereumProvider();
    const chainId = await provider.request({ method: "eth_chainId" });
    if (
      typeof chainId !== "string" ||
      Number(BigInt(chainId)) !== AVALANCHE_X402_CLIENT.chainId
    ) throw new Error("privy_provider_chain_mismatch");
    const signature = await provider.request({
      method: "eth_signTypedData_v4",
      params: [current.payment.walletAddress, JSON.stringify(current.payment.typedData)],
    });
    if (typeof signature !== "string") throw new Error("avalanche_x402_invalid_privy_signature");
    // Persist before settling: a retry must never request a second signature.
    storeSignature(current.payment.id, signature);
    return signature;
  }

  async function settle() {
    let current = prepared;
    if (!current || delivery || settlementLock.current) return;
    settlementLock.current = true;
    setLocked(true);
    try {
      if (new Date(current.payment.expiresAt).getTime() <= Date.now() + 5_000) {
        const refreshed = await prepare();
        if (!sameApprovalScope(current, refreshed)) {
          throw new Error("avalanche_x402_refreshed_scope_changed");
        }
        current = refreshed;
      }
      const signature = await signWithPrivy(current);
      const header = x402Settlement.encodePreparedAvalancheX402Signature({ prepared: current, signature });
      const response = await fetch(current.payment.resourceUrl, {
        method: "POST",
        headers: {
          Authorization: await authorization(),
          "Content-Type": "application/json",
          "PAYMENT-SIGNATURE": header,
        },
        body: JSON.stringify(AVALANCHE_X402_CLIENT.reportBody),
      });
      const text = await response.text();
      if (response.status === 402) throw new Error("avalanche_x402_payment_rejected");
      if (!response.ok) {
        const failure = JSON.parse(text) as { error?: string };
        throw new Error(failure.error ?? "avalanche_x402_settlement_failed");
      }
      const body = JSON.parse(text) as unknown;
      const verified = validateAvalancheX402Delivery({
        body,
        paymentId: current.payment.id,
        deliveryIdHeader: response.headers.get("X-Carmelita-Delivery-Id"),
        bodyHashHeader: response.headers.get("X-Carmelita-Body-SHA256"),
        computedBodyHash: await sha256Hex(canonicalAvalancheX402Delivery(body)),
      });
      setDelivery(verified);
      onReceipt({
        title: "Avalanche Fuji x402 payment",
        network: "Avalanche Fuji · 43113",
        rows: [
          { label: t.amount, value: `${current.payment.amountDisplay} USDC` },
          { label: t.to, value: current.payment.payTo },
          { label: t.deliveryId, value: verified.deliveryId },
        ],
        transactionHash: verified.transactionHash,
        explorerUrl: `https://testnet.snowtrace.io/tx/${verified.transactionHash}`,
      });
    } finally {
      settlementLock.current = false;
      setLocked(false);
    }
  }

  async function run(task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await task();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "avalanche_x402_action_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="avalanche-chat-action">
      {!prepared && (
        <button type="button" className="primary" disabled={busy} onClick={() => void run(prepare)}>
          {busy ? t.working : t.prepare}
        </button>
      )}

      {prepared && !delivery && (
        <section className="defindex-approval prepared" aria-label="Avalanche x402 payment approval">
          <span>{t.banner}</span>
          <h4>{prepared.payment.amountDisplay} USDC · Fuji</h4>
          <dl>
            <div><dt>{t.network}</dt><dd>Avalanche Fuji · 43113</dd></div>
            <div><dt>{t.from}</dt><dd>{prepared.payment.walletAddress}</dd></div>
            <div><dt>{t.to}</dt><dd>{prepared.payment.payTo}</dd></div>
            <div><dt>{t.amount}</dt><dd>{prepared.payment.amountDisplay} USDC</dd></div>
            <div><dt>{t.resource}</dt><dd>{prepared.payment.resourceUrl}</dd></div>
            <div><dt>{t.expires}</dt><dd>{prepared.payment.expiresAt}</dd></div>
          </dl>
          <button type="button" disabled={busy || locked} onClick={() => void run(settle)}>
            {busy ? t.working : prepared.replayed ? t.retry : t.approve}
          </button>
        </section>
      )}

      {delivery && (
        <section className="defindex-approval" aria-label="Avalanche x402 delivery">
          <span>{t.delivered}</span>
          <h4>{delivery.report}</h4>
          <dl>
            <div><dt>{t.deliveryId}</dt><dd>{delivery.deliveryId}</dd></div>
            <div><dt>{t.transaction}</dt><dd>{delivery.transactionHash}</dd></div>
          </dl>
          <a
            href={`https://testnet.snowtrace.io/tx/${delivery.transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            Snowtrace
          </a>
        </section>
      )}

      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
