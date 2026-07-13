import type { Metadata } from "next";
import Link from "next/link";
import WaitlistForm from "./waitlist-form";

export const metadata: Metadata = {
  title: "Early access | agent-assistant",
  description:
    "Join the private beta for an assistant that can take useful actions under your control.",
};

export default function WaitlistPage() {
  return (
    <main className="waitlist-page">
      <nav className="waitlist-nav shell">
        <Link className="brand" href="/">
          <b>AA</b>
          agent-assistant
        </Link>
        <Link href="/">Back home</Link>
      </nav>

      <section className="waitlist-hero waitlist-hero-simple shell">
        <div className="waitlist-copy">
          <p className="eyebrow">PRIVATE BETA · LATIN AMERICA TO THE WORLD</p>
          <h1>Be first to delegate real actions.</h1>
          <p className="waitlist-lede">
            Join the early group testing an assistant that can research, book,
            hire and pay—with your approval at every important step.
          </p>
          <div className="waitlist-signals">
            <span>No wallet required</span>
            <span>No funds enabled</span>
            <span>You stay in control</span>
          </div>
          <div className="waitlist-proof waitlist-proof-simple">
            <strong>What happens next</strong>
            <p>Join now. We will contact selected testers personally.</p>
          </div>
        </div>
        <WaitlistForm />
      </section>

      <footer className="waitlist-footer shell">
        <span>Private beta invitations are sent in small waves.</span>
        <Link href="/connections">Explore integrations</Link>
      </footer>
    </main>
  );
}
