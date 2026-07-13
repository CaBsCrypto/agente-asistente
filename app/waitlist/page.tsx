import type { Metadata } from "next";
import WaitlistForm from "./waitlist-form";

export const metadata: Metadata = {
  title: "Join the waitlist | agent-assistant",
  description:
    "Apply for early access to controlled agent actions across travel, work, local services and on-chain finance.",
};

const tracks = [
  [
    "01",
    "Use it",
    "Ask an agent to search, prepare and safely execute useful actions.",
  ],
  [
    "02",
    "Offer it",
    "Make your products or services visible and actionable to agents.",
  ],
  [
    "03",
    "Build on it",
    "Connect your own assistant through one reusable commerce protocol.",
  ],
];

export default function WaitlistPage() {
  return (
    <main className="waitlist-page">
      <nav className="waitlist-nav shell">
        <a className="brand" href="/">
          <b>AA</b>agent-assistant
        </a>
        <a href="/connections">Integration Lab</a>
      </nav>

      <section className="waitlist-hero shell">
        <div className="waitlist-copy">
          <p className="eyebrow">EARLY ACCESS - LATIN AMERICA TO THE WORLD</p>
          <h1>Your agent should do more than answer.</h1>
          <p className="waitlist-lede">
            Join the private beta for an assistant that can discover, book,
            hire and pay while you control every important decision.
          </p>
          <div className="waitlist-signals">
            <span>Non-custodial</span>
            <span>Explicit approval</span>
            <span>Verifiable receipts</span>
          </div>
          <div className="waitlist-proof">
            <strong>First integration tracks</strong>
            <p>DeFindex - UNBLCK - ArcusX - Travala</p>
          </div>
        </div>
        <WaitlistForm />
      </section>

      <section className="waitlist-tracks shell" aria-label="Early access tracks">
        {tracks.map(([number, title, description]) => (
          <article key={number}>
            <b>{number}</b>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <footer className="waitlist-footer shell">
        <span>Private beta applications are reviewed in waves.</span>
        <a href="/">Back to agent-assistant</a>
      </footer>
    </main>
  );
}