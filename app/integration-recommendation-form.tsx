"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Locale } from "./language-toggle";

export type IntegrationFormCopy = {
  eyebrow: string;
  title: string;
  text: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  useCaseLabel: string;
  useCasePlaceholder: string;
  consent: string;
  submit: string;
  sending: string;
  success: string;
  duplicate: string;
  error: string;
};

export default function IntegrationRecommendationForm({
  locale,
  copy,
}: {
  locale: Locale;
  copy: IntegrationFormCopy;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<
    "idle" | "sending" | "success" | "duplicate" | "error"
  >("idle");
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstInput.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");

    const form = new FormData(event.currentTarget);
    const payload = {
      integrationName: String(form.get("integrationName") ?? ""),
      email: String(form.get("email") ?? ""),
      useCase: String(form.get("useCase") ?? ""),
      website: String(form.get("website") ?? ""),
      locale,
      source: "landing-integrations",
      consent: form.get("consent") === "on",
    };

    try {
      const response = await fetch("/api/integration-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { status?: string };

      if (!response.ok) {
        setState("error");
        return;
      }

      setState(body.status === "already_received" ? "duplicate" : "success");
      if (body.status !== "already_received") event.currentTarget.reset();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="home-integration-recommendation">
      <button
        className="home-integration-trigger"
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span>+</span> {copy.title}
      </button>

      {open && (
        <div
          className="home-integration-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="home-integration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="integration-modal-title"
          >
            <button
              className="home-integration-modal-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label={locale === "es" ? "Cerrar" : locale === "pt" ? "Fechar" : "Close"}
            >
              {"\u00d7"}
            </button>

            <form className="home-integration-form" onSubmit={submit}>
              <div>
                <p className="eyebrow">{copy.eyebrow}</p>
                <h3 id="integration-modal-title">{copy.title}</h3>
                <p>{copy.text}</p>
              </div>

              <label>
                <span>{copy.nameLabel}</span>
                <input
                  ref={firstInput}
                  name="integrationName"
                  placeholder={copy.namePlaceholder}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                <span>{copy.emailLabel}</span>
                <input
                  name="email"
                  type="email"
                  placeholder={copy.emailPlaceholder}
                  maxLength={254}
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                <span>{copy.useCaseLabel}</span>
                <textarea
                  name="useCase"
                  placeholder={copy.useCasePlaceholder}
                  maxLength={500}
                  rows={3}
                />
              </label>

              <label className="home-integration-honeypot" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>

              <label className="home-integration-consent">
                <input name="consent" type="checkbox" required />
                <span>{copy.consent}</span>
              </label>

              <button type="submit" disabled={state === "sending"}>
                {state === "sending" ? copy.sending : copy.submit}
              </button>

              {state !== "idle" && state !== "sending" && (
                <p
                  className={"home-integration-response " + state}
                  role="status"
                  aria-live="polite"
                >
                  {state === "success"
                    ? copy.success
                    : state === "duplicate"
                      ? copy.duplicate
                      : copy.error}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
