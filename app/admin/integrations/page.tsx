import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireAdminPage } from "@/app/admin/auth";
import BrandLockup from "@/app/brand-lockup";
import { getDb, hasDatabase } from "@/db";
import { ensureIntegrationRecommendationSchema } from "@/app/integrations/storage";
import { integrationRecommendations } from "@/db/schema";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Integration demand | Carmelita",
  description: "Private integration recommendations submitted from the landing.",
  robots: { index: false, follow: false },
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function IntegrationDemandPage() {
  await requireAdminPage("/admin/integrations");

  if (hasDatabase()) {
    await ensureIntegrationRecommendationSchema();
  }

  const recommendations = hasDatabase()
    ? await getDb()
        .select()
        .from(integrationRecommendations)
        .orderBy(desc(integrationRecommendations.createdAt))
    : [];

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link className="brand" href="/">
          <BrandLockup />
        </Link>
        <div>
          <Link className="admin-stellar-link" href="/admin">
            Founder operations
          </Link>
          <Link className="admin-stellar-link" href="/connections">
            Integration Lab
          </Link>
        </div>
      </header>

      <div className="admin-main integration-demand-admin">
        <section className="admin-heading">
          <div>
            <p className="eyebrow">INTEGRATION DEMAND</p>
            <h1>What people want Carmelita to connect next.</h1>
            <p>
              Recommendations submitted from the public landing, including the
              requested service, use case and contact email.
            </p>
          </div>
          <div className="admin-heading-actions">
            <Link href="/">Open public landing</Link>
            <small>{recommendations.length} recommendations saved</small>
          </div>
        </section>

        <section className="integration-demand-list">
          <header>
            <span>Integration</span>
            <span>Requested outcome</span>
            <span>Contact</span>
            <span>Received</span>
          </header>

          {recommendations.length === 0 && (
            <div className="integration-demand-empty">
              No integration recommendations yet.
            </div>
          )}

          {recommendations.map((recommendation) => (
            <article key={recommendation.id}>
              <div>
                <strong>{recommendation.integrationName}</strong>
                <small>{recommendation.locale.toUpperCase()} ? {recommendation.status}</small>
              </div>
              <p>{recommendation.useCase || "No use case provided."}</p>
              <a href={"mailto:" + recommendation.email}>{recommendation.email}</a>
              <time dateTime={recommendation.createdAt.toISOString()}>
                {formatDate(recommendation.createdAt)}
              </time>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
