import Link from "next/link";
import BrandLockup from "../../brand-lockup";
import { requireAdminPage } from "@/app/admin/auth";
import { getPrivyStellarReadiness } from "@/app/privy-stellar";
import StellarLab from "./stellar-lab";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privy + Stellar testnet lab | Carmelita",
  description: "Private founder lab for Stellar wallet and signing tests.",
  robots: { index: false, follow: false },
};

export default async function StellarAdminPage() {
  await requireAdminPage("/admin/stellar");
  const readiness = getPrivyStellarReadiness();

  return (
    <main className="stellar-lab-page">
      <header className="admin-topbar">
        <Link className="brand" href="/">
          <BrandLockup />
        </Link>
        <nav className="stellar-admin-nav">
          <Link href="/admin">Waitlist CRM</Link>
          <span>Founder only</span>
        </nav>
      </header>

      <div className="stellar-lab-shell">
        <section className="stellar-lab-heading">
          <div>
            <p className="eyebrow">PRIVY + STELLAR SDK</p>
            <h1>Prove the wallet layer before moving money.</h1>
            <p>
              Create a real Stellar wallet through Privy, fund it on testnet,
              inspect Horizon balances, and verify an Ed25519 signature locally.
            </p>
          </div>
          <aside className={readiness.configured ? "ready" : "blocked"}>
            <i />
            <div>
              <strong>
                {readiness.configured
                  ? "Privy credentials detected"
                  : "Privy credentials required"}
              </strong>
              <small>{readiness.network} · no real funds</small>
            </div>
          </aside>
        </section>

        <StellarLab initialReadiness={readiness} />
      </div>
    </main>
  );
}
