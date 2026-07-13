"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginForm({
  returnTo,
  configured,
}: {
  returnTo: string;
  configured: boolean;
}) {
  const [state, setState] = useState<
    "idle" | "submitting" | "error" | "unavailable"
  >(configured ? "idle" : "unavailable");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;

    setState("submitting");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });

    if (response.ok) {
      window.location.assign(returnTo);
      return;
    }

    setState(response.status === 503 ? "unavailable" : "error");
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>
        <span>Username</span>
        <input
          name="username"
          autoComplete="username"
          defaultValue="founder"
          required
          disabled={!configured}
        />
      </label>
      <label>
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          disabled={!configured}
          autoFocus
        />
      </label>
      <button disabled={state === "submitting" || !configured}>
        {state === "submitting" ? "Opening workspace..." : "Enter operations"}
      </button>
      {state === "error" && (
        <p role="alert">Those credentials do not match. Try again.</p>
      )}
      {state === "unavailable" && (
        <p role="alert">
          Founder access is not configured in this environment yet.
        </p>
      )}
    </form>
  );
}
