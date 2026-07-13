"use client";

import { FormEvent, useEffect, useState } from "react";

type SubmissionState =
  | "idle"
  | "submitting"
  | "joined"
  | "already"
  | "error"
  | "offline";

export default function WaitlistForm() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [source, setSource] = useState("website");
  const [referral, setReferral] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setSource(query.get("utm_source") || "website");
    setReferral(query.get("ref") || query.get("utm_campaign") || "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    const form = new FormData(event.currentTarget);
    const payload = {
      email: form.get("email"),
      role: form.get("role"),
      useCase: form.get("useCase"),
      country: form.get("country"),
      company: form.get("company"),
      consent: form.get("consent") === "on",
      website: form.get("website"),
      source,
      referral,
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
      <div className="waitlist-success" role="status">
        <span>EARLY ACCESS</span>
        <h2>
          {state === "joined"
            ? "You are on the list."
            : "You are already on the list."}
        </h2>
        <p>
          We will contact you when the first controlled agent actions are ready
          to test.
        </p>
        <a href="/connections">Explore the integration lab</a>
      </div>
    );
  }

  return (
    <form className="waitlist-form" onSubmit={submit}>
      <div className="form-heading">
        <span>PRIVATE BETA</span>
        <h2>Join the first action network.</h2>
        <p>Tell us where an agent should help you first.</p>
      </div>

      <label>
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
      </label>

      <div className="form-pair">
        <label>
          <span>I am a...</span>
          <select name="role" required defaultValue="">
            <option value="" disabled>
              Select one
            </option>
            <option value="individual">Individual</option>
            <option value="merchant">Merchant or service business</option>
            <option value="agent-builder">Agent developer</option>
            <option value="partner">Platform or integration partner</option>
            <option value="investor">Investor</option>
          </select>
        </label>
        <label>
          <span>First action</span>
          <select name="useCase" required defaultValue="">
            <option value="" disabled>
              Select one
            </option>
            <option value="travel">Book travel</option>
            <option value="local-services">Reserve local services</option>
            <option value="digital-work">Hire or complete digital work</option>
            <option value="onchain-finance">Manage on-chain finance</option>
            <option value="merchant-tools">Make my business agent-ready</option>
            <option value="agent-integrations">Connect my agent</option>
            <option value="other">Something else</option>
          </select>
        </label>
      </div>

      <div className="form-pair">
        <label>
          <span>
            Country <small>Optional</small>
          </span>
          <input
            name="country"
            autoComplete="country-name"
            maxLength={80}
            placeholder="Chile"
          />
        </label>
        <label>
          <span>
            Company <small>Optional</small>
          </span>
          <input
            name="company"
            autoComplete="organization"
            maxLength={120}
            placeholder="Company or project"
          />
        </label>
      </div>

      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <label className="consent">
        <input name="consent" type="checkbox" required />
        <span>
          I agree to receive private-beta and product updates. Unsubscribe
          anytime.
        </span>
      </label>

      <button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Joining..." : "Join the waitlist"}
      </button>

      {state === "offline" && (
        <p className="form-message" role="alert">
          Early-access storage is being activated. Please try again shortly.
        </p>
      )}
      {state === "error" && (
        <p className="form-message" role="alert">
          We could not save your request. Please review the form and try again.
        </p>
      )}
      <small className="form-footnote">
        No wallet required. No funds. We collect only the details needed to
        organize the beta.
      </small>
    </form>
  );
}