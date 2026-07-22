import Link from "next/link";
import BrandLockup from "../brand-lockup";
import ActionConsole from "./action-console";
import RecordingGuide from "./recording-guide";

export const metadata = {
  title: "Live action demo | Carmelita",
  description: "See the live Privy, Stellar Testnet and x402 payment proof.",
};

export default function DemoPage() {
  return (
    <main className="demo-page">
      <nav className="demo-nav shell">
        <Link className="brand" href="/"><BrandLockup /></Link>
        <div><span>LIVE TESTNET</span><Link href="/developers">API docs</Link></div>
      </nav>

      <header className="demo-intro shell">
        <div>
          <p className="eyebrow">90-SECOND PRODUCT PROOF</p>
          <h1>One agent action. <em>Zero duplicate charges.</em></h1>
          <p>A Privy-owned wallet paid the official Stellar x402 resource once. Replaying the same payment returns the original receipt and leaves the USDC balance unchanged.</p>
        </div>
        <aside>
          <strong>What is real today</strong>
          <span>Privy wallet authorization</span>
          <span>0.01 USDC settled on Stellar Testnet</span>
          <span>Durable receipt and replay protection in Neon</span>
          <small>The action console below remains a separate no-funds architecture sandbox.</small>
        </aside>
      </header>

      <RecordingGuide />
      <div id="safety-proof"><ActionConsole /></div>

      <section className="demo-next shell">
        <div><p className="eyebrow">LIVE RECEIPT</p><h2>Open the agent, restore the latest x402 payment and verify a zero-debit replay.</h2></div>
        <Link href="/agent">Open the agent</Link>
      </section>
    </main>
  );
}