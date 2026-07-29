"use client";

import { useRef, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { useSignRawHash } from "@privy-io/react-auth/extended-chains";
import type { Locale } from "@/app/language-toggle";

export type CctpBridgeWalletAction = {
  type: "cctp.bridge";
  network: "avalanche:fuji";
  destinationNetwork: "stellar:testnet";
  amount: string;
  requestId?: string;
};

type EvmPreview = {
  kind: "approve" | "burn";
  chainId: 43113;
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: "0x0";
  gas: `0x${string}`;
  gasPrice: `0x${string}`;
  nonce: `0x${string}`;
  amountAtomic: string;
  expiresAt: string;
};

type Transfer = {
  id: string;
  status: string;
  amount: string;
  amountAtomic: string;
  sourceAddress: string;
  destinationAddress: string;
  evm: EvmPreview | null;
  approveTransactionHash: string | null;
  burnTransactionHash: string | null;
  mintTransactionHash: string | null;
  mint: {
    signingHash: `0x${string}`;
    signingAddress: string;
    network: "stellar:testnet";
    contract: string;
    method: "mint_and_forward";
  } | null;
  error: string | null;
};

type TrustlineApproval = {
  id: string;
  signingAddress: string;
  signingHash: `0x${string}` | null;
  expiresAt: string;
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
    prepare: "Start controlled CCTP bridge",
    trustline: "Confirm Circle USDC trustline",
    approve: "Confirm exact USDC allowance",
    burn: "Confirm USDC burn on Fuji",
    attestation: "Check Circle attestation",
    mint: "Confirm mint on Stellar",
    retry: "Verify submitted transaction",
    working: "Working...",
    risk: "HIGH RISK · CROSS-CHAIN TRANSACTION",
    from: "Source",
    to: "Destination",
    amount: "Amount",
    stage: "Current stage",
    contract: "Contract",
    complete: "Bridge completed and verified on Stellar Testnet.",
  },
  es: {
    prepare: "Iniciar bridge CCTP controlado",
    trustline: "Confirmar trustline USDC de Circle",
    approve: "Confirmar allowance USDC exacto",
    burn: "Confirmar burn de USDC en Fuji",
    attestation: "Revisar attestation de Circle",
    mint: "Confirmar mint en Stellar",
    retry: "Verificar transacción enviada",
    working: "Procesando...",
    risk: "ALTO RIESGO · TRANSACCIÓN CROSS-CHAIN",
    from: "Origen",
    to: "Destino",
    amount: "Monto",
    stage: "Etapa actual",
    contract: "Contrato",
    complete: "Bridge completado y verificado en Stellar Testnet.",
  },
  pt: {
    prepare: "Iniciar ponte CCTP controlada",
    trustline: "Confirmar trustline USDC da Circle",
    approve: "Confirmar allowance USDC exata",
    burn: "Confirmar burn de USDC na Fuji",
    attestation: "Verificar attestation da Circle",
    mint: "Confirmar mint na Stellar",
    retry: "Verificar transação enviada",
    working: "Processando...",
    risk: "ALTO RISCO · TRANSAÇÃO CROSS-CHAIN",
    from: "Origem",
    to: "Destino",
    amount: "Valor",
    stage: "Etapa atual",
    contract: "Contrato",
    complete: "Ponte concluída e verificada na Stellar Testnet.",
  },
};

export default function CctpBridgeAction({
  action,
  locale,
  getAccessToken,
  onReceipt,
}: {
  action: CctpBridgeWalletAction;
  locale: Locale;
  getAccessToken: () => Promise<string | null>;
  onReceipt: (receipt: Receipt) => void;
}) {
  const t = copy[locale];
  const { wallets } = useWallets();
  const { signRawHash } = useSignRawHash();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [trustline, setTrustline] = useState<TrustlineApproval | null>(null);
  const [submitted, setSubmitted] = useState<{
    kind: "approve" | "burn";
    hash: `0x${string}`;
  } | null>(null);
  const lock = useRef(false);

  async function authorization() {
    const token = await getAccessToken();
    if (!token) throw new Error("authentication_required");
    return `Bearer ${token}`;
  }

  async function post(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: await authorization(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok && response.status !== 202) {
      throw new Error(result.error ?? "cctp_request_failed");
    }
    return result;
  }

  function apply(result: { transfer: Transfer; nextAction: string | null }) {
    setTransfer(result.transfer);
    setNextAction(result.nextAction);
    return result.transfer;
  }

  async function prepareTrustline(current: Transfer) {
    const result = await post("/api/agent/x402", {
      action: "prepare_trustline",
      requestId: `${action.requestId ?? current.id}-cctp-circle-trustline`,
    });
    if (result.alreadyComplete) {
      const next = await post("/api/agent/bridge/cctp/execute", {
        action: "prepare_next",
        transferId: current.id,
      });
      apply(next);
      return;
    }
    setTrustline(result.approval);
  }

  async function prepare() {
    if (!action.requestId) throw new Error("cctp_request_id_missing");
    const result = await post("/api/agent/bridge/cctp/execute", {
      action: "prepare",
      amount: action.amount,
      requestId: action.requestId,
      explicitUserConfirmation: true,
    });
    const current = apply(result);
    if (result.nextAction === "stellar_trustline") {
      await prepareTrustline(current);
    }
  }

  async function confirmTrustline() {
    if (!trustline?.signingHash || !transfer) {
      throw new Error("cctp_trustline_not_prepared");
    }
    const signed = await signRawHash({
      address: trustline.signingAddress,
      chainType: "stellar",
      hash: trustline.signingHash,
    });
    await post("/api/agent/x402", {
      action: "execute_trustline",
      approvalId: trustline.id,
      explicitConfirmation: true,
      signature: signed.signature,
    });
    setTrustline(null);
    const next = await post("/api/agent/bridge/cctp/execute", {
      action: "prepare_next",
      transferId: transfer.id,
    });
    apply(next);
  }

  async function recordEvm(kind: "approve" | "burn", hash: `0x${string}`) {
    if (!transfer) throw new Error("cctp_transfer_missing");
    const result = await post("/api/agent/bridge/cctp/execute", {
      action: "record_evm",
      transferId: transfer.id,
      kind,
      transactionHash: hash,
    });
    setSubmitted(null);
    apply(result);
  }

  async function confirmEvm() {
    if (!transfer?.evm || lock.current) return;
    const preview = transfer.evm;
    if (submitted) {
      await recordEvm(submitted.kind, submitted.hash);
      return;
    }
    if (new Date(preview.expiresAt).getTime() <= Date.now()) {
      throw new Error("cctp_evm_preview_expired");
    }
    const wallet = wallets.find(
      (candidate) =>
        candidate.walletClientType === "privy" &&
        candidate.address.toLowerCase() === preview.from.toLowerCase(),
    );
    if (!wallet) throw new Error("privy_evm_wallet_not_available_in_session");
    await wallet.switchChain(43113);
    const provider = await wallet.getEthereumProvider();
    const chainId = await provider.request({ method: "eth_chainId" });
    if (typeof chainId !== "string" || Number(BigInt(chainId)) !== 43113) {
      throw new Error("privy_provider_chain_mismatch");
    }
    lock.current = true;
    try {
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: preview.from,
          to: preview.to,
          data: preview.data,
          value: preview.value,
          gas: preview.gas,
          gasPrice: preview.gasPrice,
          nonce: preview.nonce,
        }],
      });
      if (typeof hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        throw new Error("cctp_privy_transaction_hash_missing");
      }
      const submittedAction = {
        kind: preview.kind,
        hash: hash.toLowerCase() as `0x${string}`,
      };
      setSubmitted(submittedAction);
      await recordEvm(submittedAction.kind, submittedAction.hash);
    } finally {
      lock.current = false;
    }
  }

  async function checkAttestation() {
    if (!transfer) throw new Error("cctp_transfer_missing");
    const result = await post("/api/agent/bridge/cctp/execute", {
      action: "attestation",
      transferId: transfer.id,
    });
    apply(result);
    if (result.attestationStatus === "pending") {
      setNotice("Circle attestation pending. Retry this same step in a moment.");
    }
  }

  async function confirmMint() {
    if (!transfer?.mint) throw new Error("cctp_mint_not_prepared");
    const signed = await signRawHash({
      address: transfer.mint.signingAddress,
      chainType: "stellar",
      hash: transfer.mint.signingHash,
    });
    const result = await post("/api/agent/bridge/cctp/execute", {
      action: "execute_mint",
      transferId: transfer.id,
      explicitUserConfirmation: true,
      signature: signed.signature,
    });
    const completed = apply(result);
    setNotice(t.complete);
    onReceipt({
      title: "Circle CCTP V2 bridge",
      network: "Avalanche Fuji → Stellar Testnet",
      rows: [
        { label: t.amount, value: `${completed.amount} USDC` },
        { label: t.from, value: completed.sourceAddress },
        { label: t.to, value: completed.destinationAddress },
      ],
      transactionHash: completed.mintTransactionHash,
      explorerUrl: result.explorerUrl ?? null,
    });
  }

  async function run(task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await task();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "cctp_action_failed");
    } finally {
      setBusy(false);
    }
  }

  const label = !transfer ? t.prepare
    : trustline ? t.trustline
      : submitted ? t.retry
        : nextAction === "approve" ? t.approve
          : nextAction === "burn" ? t.burn
            : nextAction === "attestation" ? t.attestation
              : nextAction === "mint" ? t.mint
                : t.prepare;
  const task = !transfer ? prepare
    : trustline ? confirmTrustline
      : submitted ? confirmEvm
        : nextAction === "approve" || nextAction === "burn" ? confirmEvm
          : nextAction === "attestation" ? checkAttestation
            : nextAction === "mint" ? confirmMint
              : prepare;

  return (
    <section className="defindex-approval prepared" aria-label="Circle CCTP bridge approval">
      <span>{t.risk}</span>
      <h4>{action.amount} USDC · Fuji → Stellar</h4>
      {transfer && (
        <dl>
          <div><dt>{t.from}</dt><dd>{transfer.sourceAddress}</dd></div>
          <div><dt>{t.to}</dt><dd>{transfer.destinationAddress}</dd></div>
          <div><dt>{t.amount}</dt><dd>{transfer.amount} USDC</dd></div>
          <div><dt>{t.stage}</dt><dd>{transfer.status}</dd></div>
          {transfer.evm && <div><dt>{t.contract}</dt><dd>{transfer.evm.to}</dd></div>}
          {transfer.mint && <div><dt>{t.contract}</dt><dd>{transfer.mint.contract}</dd></div>}
        </dl>
      )}
      {transfer?.status !== "completed" && (
        <button type="button" disabled={busy} onClick={() => void run(task)}>
          {busy ? t.working : label}
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
