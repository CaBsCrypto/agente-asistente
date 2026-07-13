"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type SubmissionState =
  | "idle"
  | "submitting"
  | "joined"
  | "already"
  | "error"
  | "offline";

function readAttribution() {
  if (typeof window === "undefined") {
    return { source: "website", referral: "" };
  }

  const query = new URLSearchParams(window.location.search);
  return {
    source: query.get("utm_source") || "website",
    referral: query.get("ref") || query.get("utm_campaign") || "",
  };
}

export default function WaitlistForm() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [attribution] = useState(readAttribution);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    const form = new FormData(event.currentTarget);

    const payload = {
      email: form.get("email"),
      role: "unspecified",
      useCase: "unspecified",
      consent: form.get("consent") === "on",
      website: form.get("website"),
      source: attribution.source,
      referral: attribution.referral,
    };

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { status?: string };
      if (result.status === "joined") setState("joined");
      else if (result.status === "already_joined") setState("already");
      else if (result.status === "storage_unavailable") setState("offline");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  if (state === "joined" || state === "already") {
    return (
      <div className="waitlist-success waitlist-success-simple" role="status">
        <span>EARLY ACCESS</span>
        <h2>{state === "joined" ? "You are in." : "You are already in."}</h2>
        <p>
          We will contact selected testers personally as the first controlled
          actions become available.
        </p>
        <Link href="/connections">See what we are connecting</Link>
      </div>
    );
  }

  return (
    <form className="waitlist-form waitlist-form-simple" onSubmit={submit}>
      <div className="form-heading">
        <span>EARLY ACCESS</span>
        <h2>Join the waitlist.</h2>
        <p>Just your email. We will ask the rest when we talk.</p>
      </div>

      <label>
        <span>Email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="you@company.com"
        />
      </label>

      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <label className="consent consent-simple">
        <input name="consent" type="checkbox" required />
        <span>
          I agree to receive private-beta updates. Unsubscribe anytime.
        </span>
      </label>

      <button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Joining..." : "Waitlist"}
      </button>

      {state === "offline" && (
        <p className="form-message" role="alert">
          Early-access storage is being activated. Please try again shortly.
        </p>
      )}
      {state === "error" && (
        <p className="form-message" role="alert">
          We could not save your email. Please check it and try again.
        </p>
      )}
      <small className="form-footnote">
        No wallet. No payment. Your email is only used for beta access.
      </small>
    </form>
  );
}
