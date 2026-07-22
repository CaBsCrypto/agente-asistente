"use client";

import Link from "next/link";
import BrandLockup from "../../brand-lockup";
import { FormEvent, useState } from "react";

type Provider = {
  id: string;
  slug: string;
  name: string;
  contactEmail: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export default function ProviderAdmin({
  initialProviders,
}: {
  initialProviders: Provider[];
}) {
  const [providers, setProviders] = useState(initialProviders);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setToken(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: data.get("slug"),
        name: data.get("name"),
        contactEmail: data.get("contactEmail") || undefined,
        tokenName: data.get("tokenName") || undefined,
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error || "provider_creation_failed");
      return;
    }
    setProviders((current) => [result.provider, ...current]);
    setToken(result.credential.token);
    setMessage("Provider created. Copy the token now.");
    event.currentTarget.reset();
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link className="brand" href="/">
          <BrandLockup />
        </Link>
        <div>
          <Link className="admin-stellar-link" href="/admin">Founder dashboard</Link>
          <Link className="admin-stellar-link" href="/admin/stellar">Stellar Lab</Link>
        </div>
      </header>

      <div className="admin-main">
        <section className="admin-heading">
          <div>
            <p className="eyebrow">MCP PROVIDER OPERATIONS</p>
            <h1>Provision a service provider.</h1>
            <p>
              Create a provider identity and one scoped key. The raw key appears
              once; only its hash is stored.
            </p>
          </div>
        </section>

        <section className="admin-leads">
          <form onSubmit={submit}>
            <div className="admin-filters">
              <label>
                Provider name
                <input name="name" required minLength={2} placeholder="UNBLCK" />
              </label>
              <label>
                Slug
                <input name="slug" required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="unblck" />
              </label>
              <label>
                Contact email
                <input name="contactEmail" type="email" placeholder="developer@example.com" />
              </label>
              <label>
                Key name
                <input name="tokenName" placeholder="Pilot MCP key" />
              </label>
            </div>
            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create provider and key"}
            </button>
          </form>

          {message && <p>{message}</p>}
          {token && (
            <article>
              <strong>Copy this provider token now</strong>
              <pre>{token}</pre>
              <button type="button" onClick={() => navigator.clipboard.writeText(token)}>
                Copy token
              </button>
              <p>This token will not be shown again.</p>
            </article>
          )}
        </section>

        <section className="admin-leads">
          <h2>Service providers</h2>
          {providers.length === 0 ? (
            <p>No providers provisioned yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider) => (
                    <tr key={provider.id}>
                      <td>{provider.name}</td>
                      <td>{provider.slug}</td>
                      <td>{provider.status}</td>
                      <td>{provider.contactEmail || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
