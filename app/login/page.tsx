import Link from "next/link";
import BrandLockup from "../brand-lockup";
import LoginPanel from "./login-panel";
import { LanguageControl } from "../language-toggle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in | Carmelita",
  description: "Access Carmelita, your Stellar wallet and saved activity securely with Privy.",
};

export default function LoginPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ||
      process.env.PRIVY_APP_ID?.trim(),
  );

  return (
    <main className="login-page">
      <nav className="demo-nav shell">
        <Link className="brand" href="/">
          <BrandLockup />
        </Link>
        <div className="lab-nav-actions"><LanguageControl compact /><Link className="login-back" href="/guide">Guide</Link><Link className="login-back" href="/">Home</Link></div>
      </nav>
      <LoginPanel configured={configured} />
    </main>
  );
}