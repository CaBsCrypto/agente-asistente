"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

// Minimal typing for the Telegram Mini App runtime it injects.
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

type SessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; username?: string; linked: boolean };

async function verifySession(): Promise<SessionState> {
  const initData = window.Telegram?.WebApp?.initData ?? "";
  if (!initData) {
    return { status: "error", message: "Abre esta página desde el bot de Telegram." };
  }
  const response = await fetch("/api/telegram/mini/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    user?: { username?: string };
    linked?: boolean;
  };
  if (!response.ok || !body.ok) {
    return { status: "error", message: "No se pudo verificar tu sesión de Telegram." };
  }
  return { status: "ready", username: body.user?.username, linked: Boolean(body.linked) };
}

// SCAFFOLD (PR 3/3): this page proves the Mini App round trip — Telegram opens it,
// we verify initData server-side, and show who is connected. Wallet signing (Privy)
// is NOT wired yet; that step needs Privy configured for Telegram and live testing.
export default function TelegramSignPage() {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady) return;
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    verifySession()
      .then(setState)
      .catch(() => setState({ status: "error", message: "Ocurrió un error inesperado." }));
  }, [scriptReady]);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "ui-sans-serif, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0e1712",
          color: "#eae3d2",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 420,
            border: "1px solid #26362c",
            borderRadius: 16,
            padding: 24,
            background: "#16221b",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, letterSpacing: ".12em", color: "#e0b24e", fontWeight: 800 }}>
            AGENT · TELEGRAM
          </p>
          <h1 style={{ margin: "8px 0 16px", fontSize: 22, letterSpacing: "-.02em" }}>Firmar acción</h1>

          {state.status === "loading" && <p style={{ color: "#a9b6ab" }}>Verificando tu sesión…</p>}

          {state.status === "error" && (
            <p style={{ color: "#f2704d", fontWeight: 700 }}>{state.message}</p>
          )}

          {state.status === "ready" && (
            <div style={{ display: "grid", gap: 14 }}>
              <p style={{ margin: 0, color: "#a9b6ab" }}>
                Conectado como{" "}
                <b style={{ color: "#eae3d2" }}>{state.username ? `@${state.username}` : "usuario de Telegram"}</b>
                {" · "}
                {state.linked ? "cuenta vinculada" : "cuenta no vinculada"}
              </p>
              <button
                type="button"
                disabled
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #34c273",
                  background: "#1f9d55",
                  color: "#fff",
                  fontWeight: 800,
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                Firmar (próximamente)
              </button>
              <p style={{ margin: 0, fontSize: 12, color: "#74837a", lineHeight: 1.5 }}>
                La firma con la wallet (Privy) se habilitará en el siguiente paso. Tu identidad de Telegram
                ya quedó verificada de forma segura en el servidor.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
