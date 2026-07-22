import type { Metadata } from "next";
import Link from "next/link";
import BrandLockup from "../brand-lockup";
import WaitlistForm from "./waitlist-form";

export const metadata: Metadata = {
  title: "Early access | Carmelita",
  description:
    "Join the private beta for Carmelita, a personal agent that acts within your rules.",
};

export default function WaitlistPage() {
  return (
    <main className="waitlist-page">
      <nav className="waitlist-nav shell">
        <Link className="brand" href="/">
          <BrandLockup />
        </Link>
        <Link href="/">Back home</Link>
      </nav>

      <section className="waitlist-hero waitlist-hero-simple shell">
        <div className="waitlist-copy">
          <p className="eyebrow">PRIVATE BETA · LATIN AMERICA TO THE WORLD</p>
          <h1>Meet Carmelita before everyone else.</h1>
          <p className="waitlist-lede">
            Join the early group testing Carmelita, a personal agent that can research, book,
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
