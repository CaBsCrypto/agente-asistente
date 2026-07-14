import Link from "next/link";
import AgentOnboarding from "./agent-onboarding";
import { LanguageControl } from "../language-toggle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your agent | agent-assistant",
  description: "Sign in and receive a user-owned Stellar wallet automatically.",
};

export default function AgentPage() {
  const configured = Boolean(
    (process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ||
      process.env.PRIVY_APP_ID?.trim()) &&
      process.env.PRIVY_APP_SECRET?.trim(),
  );

  return (
    <main className="agent-page">
      <nav className="demo-nav shell">
        <Link className="brand" href="/">
          <b>AA</b>
          agent-assistant
        </Link>
        <div>
          <span>PRIVY + STELLAR</span>
          <LanguageControl compact />
          <Link href="/demo">Demo</Link>
        </div>
      </nav>
      <AgentOnboarding configured={configured} />
    </main>
  );
}
