"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLocale } from "../language-toggle";

const copy = {
  en: {
    setupEyebrow: "SECURE ACCOUNT ACCESS", setupTitle: "Privy credentials are required.", setupText: "The login experience is ready but its public App ID is not configured in this environment.", missing: "Missing configuration",
    eyebrow: "YOUR AGENT ACCOUNT", title: "One login for your agent, wallet and history.", text: "Continue securely with email, Google or a passkey. Privy manages your identity and wallet authorization; agent-assistant stores only the profile and activity required to operate.", ready: "Sign in or create account", loading: "Preparing secure sign-in...", boundary: "No wallet password, seed phrase or private key is stored by agent-assistant.", includes: "ACCOUNT INCLUDES", steps: ["Privy identity and secure session", "Automatic user-owned Stellar wallet", "Neon-backed profile and activity history", "Policies, intents and receipts linked to you"],
  },
  es: {
    setupEyebrow: "ACCESO SEGURO", setupTitle: "Se requieren credenciales de Privy.", setupText: "La experiencia de ingreso está lista, pero falta configurar el App ID público en este entorno.", missing: "Configuración faltante",
    eyebrow: "TU CUENTA DE AGENTE", title: "Un ingreso para tu agente, wallet e historial.", text: "Continúa de forma segura con email, Google o passkey. Privy administra tu identidad y autorización de wallet; agent-assistant guarda solo el perfil y la actividad necesarios.", ready: "Ingresar o crear cuenta", loading: "Preparando ingreso seguro...", boundary: "agent-assistant no guarda contraseña de wallet, seed phrase ni clave privada.", includes: "LA CUENTA INCLUYE", steps: ["Identidad Privy y sesión segura", "Wallet Stellar automática propiedad del usuario", "Perfil e historial persistentes en Neon", "Políticas, intents y recibos vinculados a ti"],
  },
  pt: {
    setupEyebrow: "ACESSO SEGURO", setupTitle: "As credenciais da Privy são necessárias.", setupText: "A experiência de login está pronta, mas o App ID público não está configurado neste ambiente.", missing: "Configuração ausente",
    eyebrow: "SUA CONTA DE AGENTE", title: "Um login para seu agente, wallet e histórico.", text: "Continue com segurança usando email, Google ou passkey. A Privy gerencia sua identidade e autorização da wallet; agent-assistant guarda apenas o perfil e a atividade necessários.", ready: "Entrar ou criar conta", loading: "Preparando login seguro...", boundary: "agent-assistant não armazena senha da wallet, seed phrase ou chave privada.", includes: "A CONTA INCLUI", steps: ["Identidade Privy e sessão segura", "Wallet Stellar automática do usuário", "Perfil e histórico persistentes no Neon", "Políticas, intents e recibos vinculados a você"],
  },
};

export default function LoginPanel({ configured }: { configured: boolean }) {
  const { locale } = useLocale();
  const t = copy[locale];
  if (!configured) return <LoginSetupRequired t={t} />;
  return <PrivyLogin t={t} />;
}

type LoginCopy = (typeof copy)["en"];

function LoginSetupRequired({ t }: { t: LoginCopy }) {
  return (
    <section className="login-shell shell">
      <div className="login-copy"><p className="eyebrow">{t.setupEyebrow}</p><h1>{t.setupTitle}</h1><p>{t.setupText}</p></div>
      <aside className="login-card"><strong>{t.missing}</strong><code>NEXT_PUBLIC_PRIVY_APP_ID</code></aside>
    </section>
  );
}

function PrivyLogin({ t }: { t: LoginCopy }) {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) router.replace("/agent");
  }, [authenticated, ready, router]);

  return (
    <section className="login-shell shell">
      <div className="login-copy">
        <p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.text}</p>
        <button className="agent-primary" disabled={!ready} onClick={() => login()}>{ready ? t.ready : t.loading}</button>
        <small>{t.boundary}</small>
      </div>
      <aside className="login-card">
        <header><span>{t.includes}</span><b>STELLAR TESTNET</b></header>
        <ol>{t.steps.map((step, index) => <li key={step}><b>{String(index + 1).padStart(2, "0")}</b><span>{step}</span></li>)}</ol>
      </aside>
    </section>
  );
}