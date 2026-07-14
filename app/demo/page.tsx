import Link from "next/link";
import ActionConsole from "./action-console";
import RecordingGuide from "./recording-guide";

export const metadata = {
  title: "Live action demo | agent-assistant",
  description: "Prepare, approve and replay-protect an agent action in the live sandbox.",
};

export default function DemoPage() {
  return (
    <main className="demo-page">
      <nav className="demo-nav shell">
        <Link className="brand" href="/"><b>AA</b>agent-assistant</Link>
        <div><span>LIVE SANDBOX</span><Link href="/developers">API docs</Link></div>
      </nav>

      <header className="demo-intro shell">
        <div>
          <p className="eyebrow">90-SECOND PRODUCT PROOF</p>
          <h1>One agent action. <em>Zero duplicate charges.</em></h1>
          <p>Prepare an intent, evaluate policy, approve the exact action and execute it twice. The second request must return the original receipt instead of creating another transaction.</p>
        </div>
        <aside>
          <strong>What is real today</strong>
          <span>Durable intents in Postgres</span>
          <span>Policy and authorization records</span>
          <span>Database-enforced replay protection</span>
          <small>Settlement is simulated. No wallet or funds are used.</small>
        </aside>
      </header>

      <RecordingGuide />
      <div id="safety-proof"><ActionConsole /></div>

      <section className="demo-next shell">
        <div><p className="eyebrow">NEXT PROOF</p><h2>Replace the simulated receipt with a Stellar testnet transaction.</h2></div>
        <Link href="/connections">Follow the integration lab</Link>
      </section>
    </main>
  );
}