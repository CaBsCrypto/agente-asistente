"use client";

import { useRef, useState } from "react";
import { useUser, useWallets } from "@privy-io/react-auth";
import type { Locale } from "@/app/language-toggle";

export type AvalancheWalletAction = {
  type: "avalanche.activate" | "avalanche.status" | "avalanche.fund" | "avalanche.send" | "avalanche.swap";
  network: "avalanche:fuji";
  amount?: "0.001";
  destination?: `0x${string}`;
  amountInAtomic?: string;
  requestId?: string;
};

type Preview = {
  previewId: string;
  status: string;
  chainId: 43113;
  from: string;
  destination: string;
  amount: "0.001";
  valueHex: `0x${string}`;
  gasLimitHex: `0x${string}`;
  gasPriceWei: string;
  maxGasCostWei: string;
  nonce: number;
  expiresAt: string;
  transactionHash: string | null;
  explorerUrl: string | null;
};

type SwapPreview = {
  previewId: string;
  status: string;
  network: "avalanche:fuji";
  chainId: 43113;
  from: string;
  to: string;
  data: string;
  valueWei: string;
  valueHex: `0x${string}`;
  gasLimitHex: `0x${string}`;
  gasPriceWei: string;
  maxGasCostWei: string;
  nonce: number;
  amountInAtomic: string;
  amountIn: string;
  minOutAtomic: string;
  minOut: string;
  amountOutAtomic?: string;
  amountOut?: string;
  priceUsdcPerAvax?: string;
  quoteBlockNumber: number;
  expiresAt: string;
  transactionHash: string | null;
  explorerUrl: string | null;
};

type Receipt = {
  title: string;
  network: string;
  rows: { label: string; value: string }[];
  transactionHash: string | null;
  explorerUrl: string | null;
};

type FundingStatus = {
  address: string;
  balance: string;
  balances?: {
    native?: { asset: string; balance: string };
    usdc?: { asset: string; balance: string; contract: string };
  };
  funding?: {
    automaticEnabled: boolean;
    automaticReason: string | null;
    amount: "0.005";
    claimWindow: "once_per_authenticated_user";
    primaryFaucetUrl: string;
    officialFaucetUrl: string;
    network: "avalanche:fuji";
  };
};

type FundingReceipt = {
  amount: "0.005";
  asset: "AVAX";
  transactionHash: string;
  explorerUrl: string;
  replayed: boolean;
};

const FUJI_FAUCET_URL = "https://faucets.chain.link/fuji";

const fundingCopy = {
  en: {
    open: "Open Testnet funding", title: "Fund Fuji without leaving Carmelita",
    intro: "Carmelita keeps your Privy wallet and bridge context visible while you obtain Testnet gas.",
    automatic: "Request 0.005 AVAX automatically", unavailable: "Automatic Testnet funding is not enabled in this environment yet.",
    popup: "Open secure faucet pop-up", refresh: "Check balance", copy: "Copy wallet", copied: "Wallet copied",
    close: "Close", wallet: "Privy wallet", usdc: "Fuji USDC", ready: "Gas ready", missing: "Gas required",
    safety: "Testnet only. No Mainnet funds and no wallet key are shared with the faucet.",
    blocked: "The browser blocked the faucet pop-up. Allow pop-ups for Carmelita and try again.",
  },
  es: {
    open: "Preparar gas Testnet", title: "Recarga Fuji sin salir de Carmelita",
    intro: "Carmelita mantiene visibles tu wallet Privy y el contexto del bridge mientras consigues gas de Testnet.",
    automatic: "Solicitar 0.005 AVAX autom\u00e1ticamente", unavailable: "La recarga autom\u00e1tica de Testnet a\u00fan no est\u00e1 activa en este entorno.",
    popup: "Abrir faucet en ventana segura", refresh: "Revisar saldo", copy: "Copiar wallet", copied: "Wallet copiada",
    close: "Cerrar", wallet: "Wallet Privy", usdc: "USDC en Fuji", ready: "Gas listo", missing: "Falta gas",
    safety: "Solo Testnet. No se comparten fondos Mainnet ni la clave de tu wallet con el faucet.",
    blocked: "El navegador bloque\u00f3 la ventana del faucet. Autoriza pop-ups para Carmelita e int\u00e9ntalo nuevamente.",
  },
  pt: {
    open: "Preparar gas Testnet", title: "Recarregue Fuji sem sair da Carmelita",
    intro: "A Carmelita mant\u00e9m sua wallet Privy e o contexto da ponte vis\u00edveis enquanto voc\u00ea obt\u00e9m gas de Testnet.",
    automatic: "Solicitar 0.005 AVAX automaticamente", unavailable: "O funding autom\u00e1tico de Testnet ainda n\u00e3o est\u00e1 ativo neste ambiente.",
    popup: "Abrir faucet em janela segura", refresh: "Verificar saldo", copy: "Copiar wallet", copied: "Wallet copiada",
    close: "Fechar", wallet: "Wallet Privy", usdc: "USDC na Fuji", ready: "Gas pronto", missing: "Gas necess\u00e1rio",
    safety: "Somente Testnet. Nenhum fundo Mainnet ou chave da wallet \u00e9 compartilhado com o faucet.",
    blocked: "O navegador bloqueou a janela do faucet. Autorize pop-ups para a Carmelita e tente novamente.",
  },
};
const copy = {
  en: {
    activate: "Activate Fuji", status: "Check Fuji wallet", fund: "Open official Fuji faucet",
    prepare: "Prepare exact transfer", approve: "Approve with Privy", working: "Working...",
    network: "Network", from: "From", to: "To", amount: "Amount", nonce: "Nonce",
    gas: "Maximum gas (wei)", expires: "Expires", ready: "Fuji wallet is active.",
    funded: "Live balance", retry: "Retry receipt verification", manual: "The official faucet opens separately and may require its own verification.",
    swap: "Swap AVAX for USDC", approveSwap: "Approve swap with Privy", minOut: "Minimum to receive",
    price: "USDC/AVAX price", pangolin: "Pangolin Fuji", block: "Quote block",
  },
  es: {
    activate: "Activar Fuji", status: "Revisar wallet Fuji", fund: "Abrir faucet oficial de Fuji",
    prepare: "Preparar transferencia exacta", approve: "Aprobar con Privy", working: "Procesando...",
    network: "Red", from: "Desde", to: "Destino", amount: "Monto", nonce: "Nonce",
    gas: "Gas máximo (wei)", expires: "Expira", ready: "La wallet Fuji está activa.",
    funded: "Saldo en vivo", retry: "Reintentar verificaci\u00f3n", manual: "El faucet oficial se abre por separado y puede solicitar su propia verificación.",
    swap: "Cambiar AVAX por USDC", approveSwap: "Aprobar swap con Privy", minOut: "Mínimo a recibir",
    price: "Precio USDC/AVAX", pangolin: "Pangolin Fuji", block: "Bloque de cotización",
  },
  pt: {
    activate: "Ativar Fuji", status: "Verificar wallet Fuji", fund: "Abrir faucet oficial da Fuji",
    prepare: "Preparar transferência exata", approve: "Aprovar com Privy", working: "Processando...",
    network: "Rede", from: "Origem", to: "Destino", amount: "Valor", nonce: "Nonce",
    gas: "Gas máximo (wei)", expires: "Expira", ready: "A wallet Fuji está ativa.",
    funded: "Saldo ao vivo", retry: "Tentar verifica\u00e7\u00e3o novamente", manual: "O faucet oficial abre separadamente e pode exigir sua própria verificação.",
    swap: "Trocar AVAX por USDC", approveSwap: "Aprovar swap com Privy", minOut: "Mínimo a receber",
    price: "Preço USDC/AVAX", pangolin: "Pangolin Fuji", block: "Bloco da cotação",
  },
};

function hex(value: number | string) {
  return `0x${BigInt(value).toString(16)}`;
}

export default function AvalancheChatAction({
  action,
  locale,
  getAccessToken,
  onReceipt,
}: {
  action: AvalancheWalletAction;
  locale: Locale;
  getAccessToken: () => Promise<string | null>;
  onReceipt: (receipt: Receipt) => void;
}) {
  const t = copy[locale];
  const f = fundingCopy[locale];
  const { wallets } = useWallets();
  const { refreshUser } = useUser();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [submittedHash, setSubmittedHash] = useState<string | null>(null);
  const [swapPreview, setSwapPreview] = useState<SwapPreview | null>(null);
  const [swapSubmittedHash, setSwapSubmittedHash] = useState<string | null>(null);
  const [fundingOpen, setFundingOpen] = useState(false);
  const [fundingStatus, setFundingStatus] = useState<FundingStatus | null>(null);
  const [fundingReceipt, setFundingReceipt] = useState<FundingReceipt | null>(null);
  const [copied, setCopied] = useState(false);
  // The ref is the synchronous race guard; the state mirrors it for rendering,
  // because refs must not be read during render.
  const submissionLock = useRef(false);
  const [locked, setLocked] = useState(false);

  async function authorizedFetch(url: string, init?: RequestInit) {
    const token = await getAccessToken();
    if (!token) throw new Error("authentication_required");
    return fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async function activate() {
    const response = await authorizedFetch("/api/agent/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: "avalanche:fuji",
        explicitUserConfirmation: true,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "avalanche_activation_failed");
    await refreshUser();
    setNotice(`${t.ready} ${body.wallet.address}`);
  }

  async function status() {
    const response = await authorizedFetch("/api/agent/wallets/avalanche");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "avalanche_status_failed");
    setFundingStatus(body);
    setNotice(`${t.funded}: ${body.balance} AVAX · ${body.address}`);
    return body as FundingStatus;
  }

  async function openFundingCenter() {
    setFundingOpen(true);
    await status();
  }

  async function requestAutomaticFunding() {
    const response = await authorizedFetch("/api/agent/wallets/avalanche/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ explicitUserConfirmation: true }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "fuji_distributor_failed");
    setFundingReceipt(body);
    await status();
  }

  function openFaucetPopup() {
    const popup = window.open(
      FUJI_FAUCET_URL,
      "carmelita-fuji-faucet",
      "popup=yes,width=560,height=760,resizable=yes,scrollbars=yes",
    );
    if (!popup) {
      setNotice(f.blocked);
      return;
    }
    popup.focus();
  }

  async function copyFundingAddress() {
    if (!fundingStatus?.address) return;
    await navigator.clipboard.writeText(fundingStatus.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function prepare() {
    if (!action.requestId || !action.destination || action.amount !== "0.001") {
      throw new Error("invalid_fuji_chat_action");
    }
    const response = await authorizedFetch("/api/agent/wallets/avalanche/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "prepare",
        requestId: action.requestId,
        destination: action.destination,
        amount: action.amount,
        explicitUserConfirmation: true,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "fuji_transfer_prepare_failed");
    const persistedHash = typeof body.transactionHash === "string" &&
      /^0x[a-fA-F0-9]{64}$/.test(body.transactionHash)
      ? body.transactionHash.toLowerCase()
      : null;
    if (body.status === "submitted" && !persistedHash) {
      throw new Error("fuji_submitted_hash_missing");
    }
    setPreview(body);
    setSubmittedHash(persistedHash);
  }

  async function verifySubmittedTransaction(transactionHash: string) {
    if (!preview) throw new Error("fuji_preview_missing");
    const response = await authorizedFetch("/api/agent/wallets/avalanche/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record",
        previewId: preview.previewId,
        transactionHash,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "fuji_receipt_verification_failed");
    setPreview(body);
    onReceipt({
      title: "Avalanche Fuji transfer",
      network: "Avalanche Fuji · 43113",
      rows: [
        { label: t.amount, value: `${body.amount} AVAX` },
        { label: t.to, value: body.destination },
        { label: t.nonce, value: String(body.nonce) },
      ],
      transactionHash: body.transactionHash,
      explorerUrl: body.explorerUrl,
    });
  }

  async function approve() {
    if (
      !preview ||
      preview.status !== "prepared" ||
      preview.transactionHash ||
      submittedHash ||
      submissionLock.current
    ) return;
    if (new Date(preview.expiresAt).getTime() <= Date.now()) {
      throw new Error("fuji_preview_expired");
    }
    submissionLock.current = true;
    setLocked(true);
    try {
      const wallet = wallets.find(
        (item) => item.walletClientType === "privy" &&
          item.address.toLowerCase() === preview.from.toLowerCase(),
      );
      if (!wallet) throw new Error("privy_evm_wallet_not_available_in_session");
      await wallet.switchChain(43113);
      const provider = await wallet.getEthereumProvider();
      const providerChainId = await provider.request({ method: "eth_chainId" });
      if (
        typeof providerChainId !== "string" ||
        Number(BigInt(providerChainId)) !== 43113
      ) throw new Error("privy_provider_chain_mismatch");
      const transactionHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: preview.from,
          to: preview.destination,
          value: preview.valueHex,
          gas: preview.gasLimitHex,
          gasPrice: hex(preview.gasPriceWei),
          nonce: hex(preview.nonce),
        }],
      });
      if (
        typeof transactionHash !== "string" ||
        !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)
      ) {
        throw new Error("privy_transaction_hash_missing");
      }
      // Save the hash before verification. Retry can only verify this hash.
      const normalizedHash = transactionHash.toLowerCase();
      setSubmittedHash(normalizedHash);
      await verifySubmittedTransaction(normalizedHash);
    } finally {
      submissionLock.current = false;
      setLocked(false);
    }
  }

  async function prepareSwap() {
    if (!action.amountInAtomic) {
      throw new Error("invalid_fuji_swap_action");
    }
    const response = await authorizedFetch("/api/agent/wallets/avalanche/pangolin-swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "prepare",
        requestId: action.requestId,
        amountInAtomic: action.amountInAtomic,
        explicitUserConfirmation: true,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "fuji_swap_prepare_failed");
    const persistedHash = typeof body.transactionHash === "string" &&
      /^0x[a-fA-F0-9]{64}$/.test(body.transactionHash)
      ? body.transactionHash.toLowerCase()
      : null;
    if (body.status === "submitted" && !persistedHash) {
      throw new Error("fuji_swap_submitted_hash_missing");
    }
    setSwapPreview(body);
    setSwapSubmittedHash(persistedHash);
  }

  async function verifySubmittedSwap(transactionHash: string) {
    if (!swapPreview) throw new Error("fuji_swap_preview_missing");
    const response = await authorizedFetch("/api/agent/wallets/avalanche/pangolin-swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record",
        previewId: swapPreview.previewId,
        transactionHash,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "fuji_swap_receipt_verification_failed");
    setSwapPreview(body);
    onReceipt({
      title: "Avalanche Fuji swap",
      network: "Avalanche Fuji · 43113",
      rows: [
        { label: t.amount, value: `${body.amountIn} AVAX` },
        { label: t.minOut, value: `${body.minOut} USDC` },
        { label: t.nonce, value: String(body.nonce) },
        { label: t.block, value: String(body.quoteBlockNumber) },
      ],
      transactionHash: body.transactionHash,
      explorerUrl: body.explorerUrl,
    });
  }

  async function approveSwap() {
    if (
      !swapPreview ||
      swapPreview.status !== "prepared" ||
      swapPreview.transactionHash ||
      swapSubmittedHash ||
      submissionLock.current
    ) return;
    if (new Date(swapPreview.expiresAt).getTime() <= Date.now()) {
      throw new Error("fuji_swap_preview_expired");
    }
    submissionLock.current = true;
    setLocked(true);
    try {
      const wallet = wallets.find(
        (item) => item.walletClientType === "privy" &&
          item.address.toLowerCase() === swapPreview.from.toLowerCase(),
      );
      if (!wallet) throw new Error("privy_evm_wallet_not_available_in_session");
      await wallet.switchChain(43113);
      const provider = await wallet.getEthereumProvider();
      const providerChainId = await provider.request({ method: "eth_chainId" });
      if (
        typeof providerChainId !== "string" ||
        Number(BigInt(providerChainId)) !== 43113
      ) throw new Error("privy_provider_chain_mismatch");
      const transactionHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: swapPreview.from,
          to: swapPreview.to,
          value: swapPreview.valueHex,
          data: swapPreview.data,
          gas: swapPreview.gasLimitHex,
          gasPrice: hex(swapPreview.gasPriceWei),
          nonce: hex(swapPreview.nonce),
        }],
      });
      if (
        typeof transactionHash !== "string" ||
        !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)
      ) {
        throw new Error("privy_transaction_hash_missing");
      }
      // Save the hash before verification. Retry can only verify this hash.
      const normalizedHash = transactionHash.toLowerCase();
      setSwapSubmittedHash(normalizedHash);
      await verifySubmittedSwap(normalizedHash);
    } finally {
      submissionLock.current = false;
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
      setNotice(error instanceof Error ? error.message : "avalanche_action_failed");
    } finally {
      setBusy(false);
    }
  }

  const label = action.type === "avalanche.activate" ? t.activate
    : action.type === "avalanche.status" ? t.status
      : action.type === "avalanche.fund" ? t.fund
        : action.type === "avalanche.swap" ? t.swap
          : t.prepare;
  const task = action.type === "avalanche.activate" ? activate
    : action.type === "avalanche.status" ? status
      : action.type === "avalanche.fund" ? openFundingCenter
        : action.type === "avalanche.swap" ? prepareSwap
          : prepare;

  return (
    <div className="avalanche-chat-action">
      {!preview && !swapPreview && (
        <button type="button" className="primary" disabled={busy} onClick={() => void run(task)}>
          {busy ? t.working : label}
        </button>
      )}
      {preview && (
        <section className="defindex-approval prepared" aria-label="Avalanche Fuji transaction approval">
          <span>HIGH RISK · TRANSACTION-SPECIFIC APPROVAL</span>
          <h4>0.001 AVAX · Fuji</h4>
          <dl>
            <div><dt>{t.network}</dt><dd>Avalanche Fuji · 43113</dd></div>
            <div><dt>{t.from}</dt><dd>{preview.from}</dd></div>
            <div><dt>{t.to}</dt><dd>{preview.destination}</dd></div>
            <div><dt>{t.amount}</dt><dd>{preview.amount} AVAX</dd></div>
            <div><dt>{t.nonce}</dt><dd>{preview.nonce}</dd></div>
            <div><dt>{t.gas}</dt><dd>{preview.maxGasCostWei}</dd></div>
            <div><dt>{t.expires}</dt><dd>{preview.expiresAt}</dd></div>
          </dl>
          {preview.status === "submitted" ? (
            submittedHash ? (
              <button type="button" disabled={busy} onClick={() => void run(() => verifySubmittedTransaction(submittedHash))}>
                {busy ? t.working : t.retry}
              </button>
            ) : <span>SUBMITTED HASH UNAVAILABLE · BROADCAST DISABLED</span>
          ) : preview.status === "prepared" ? (
            <button type="button" disabled={busy || locked} onClick={() => void run(approve)}>
              {busy ? t.working : t.approve}
            </button>
          ) : null}
        </section>
      )}
      {action.type === "avalanche.swap" && swapPreview && (
        <section className="defindex-approval prepared" aria-label="Pangolin Fuji swap approval">
          <span>HIGH RISK · TRANSACTION-SPECIFIC APPROVAL</span>
          <h4>{swapPreview.amountIn} AVAX → USDC · Pangolin</h4>
          <dl>
            <div><dt>{t.network}</dt><dd>{t.pangolin} · 43113</dd></div>
            <div><dt>{t.from}</dt><dd>{swapPreview.from}</dd></div>
            <div><dt>{t.to}</dt><dd>{swapPreview.to}</dd></div>
            <div><dt>{t.amount}</dt><dd>{swapPreview.amountIn} AVAX</dd></div>
            <div><dt>{t.minOut}</dt><dd>{swapPreview.minOut} USDC</dd></div>
            <div><dt>{t.price}</dt><dd>{swapPreview.priceUsdcPerAvax ?? "n/a"} USDC/AVAX</dd></div>
            <div><dt>{t.nonce}</dt><dd>{swapPreview.nonce}</dd></div>
            <div><dt>{t.block}</dt><dd>{swapPreview.quoteBlockNumber}</dd></div>
            <div><dt>{t.expires}</dt><dd>{swapPreview.expiresAt}</dd></div>
          </dl>
          {swapPreview.status === "submitted" ? (
            swapSubmittedHash ? (
              <button type="button" disabled={busy} onClick={() => void run(() => verifySubmittedSwap(swapSubmittedHash))}>
                {busy ? t.working : t.retry}
              </button>
            ) : <span>SUBMITTED HASH UNAVAILABLE · BROADCAST DISABLED</span>
          ) : swapPreview.status === "prepared" ? (
            <button type="button" disabled={busy || locked} onClick={() => void run(approveSwap)}>
              {busy ? t.working : t.approveSwap}
            </button>
          ) : null}
        </section>
      )}
      {fundingOpen && (
        <div className="fuji-funding-backdrop" role="presentation">
          <section className="fuji-funding-modal" role="dialog" aria-modal="true" aria-labelledby="fuji-funding-title">
            <header>
              <div>
                <span>AVALANCHE FUJI · TESTNET</span>
                <h3 id="fuji-funding-title">{f.title}</h3>
              </div>
              <button type="button" className="fuji-funding-close" onClick={() => setFundingOpen(false)} aria-label={f.close}>
                {f.close}
              </button>
            </header>
            <p>{f.intro}</p>
            <div className="fuji-funding-status">
              <article>
                <span>{f.wallet}</span>
                <code>{fundingStatus?.address ?? "..."}</code>
                <button type="button" onClick={() => void copyFundingAddress()} disabled={!fundingStatus?.address}>
                  {copied ? f.copied : f.copy}
                </button>
              </article>
              <article>
                <span>AVAX</span>
                <strong>{fundingStatus?.balance ?? "..."} AVAX</strong>
                <small>{Number(fundingStatus?.balance ?? 0) > 0 ? f.ready : f.missing}</small>
              </article>
              <article>
                <span>{f.usdc}</span>
                <strong>{fundingStatus?.balances?.usdc?.balance ?? "..."} USDC</strong>
                <small>Circle Testnet</small>
              </article>
            </div>
            <div className="fuji-funding-actions">
              <button
                type="button"
                className="primary"
                disabled={busy || !fundingStatus?.funding?.automaticEnabled}
                onClick={() => void run(requestAutomaticFunding)}
              >
                {busy ? t.working : f.automatic}
              </button>
              {!fundingStatus?.funding?.automaticEnabled && <small>{f.unavailable}</small>}
              <button type="button" onClick={openFaucetPopup}>{f.popup}</button>
              <button type="button" disabled={busy} onClick={() => void run(status)}>{f.refresh}</button>
            </div>
            {fundingReceipt && (
              <a className="fuji-funding-receipt" href={fundingReceipt.explorerUrl} target="_blank" rel="noreferrer">
                {fundingReceipt.amount} {fundingReceipt.asset} · {fundingReceipt.transactionHash.slice(0, 12)}...
              </a>
            )}
            <p className="fuji-funding-safety">{f.safety}</p>
            {notice && <p className="fuji-funding-notice" role="status">{notice}</p>}
          </section>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}

