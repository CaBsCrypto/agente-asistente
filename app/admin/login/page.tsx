import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getAdminIdentity,
  isPasswordAdminConfigured,
  sanitizeAdminReturnTo,
} from "@/app/admin/auth";
import AdminLoginForm from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Founder access | agent-assistant",
  description: "Private operations workspace for agent-assistant.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const identity = await getAdminIdentity();
  if (identity) redirect("/admin");

  const params = await searchParams;
  const returnTo = sanitizeAdminReturnTo(params.returnTo);

  return (
    <main className="admin-login-page">
      <section className="admin-login-shell">
        <Link className="brand" href="/">
          <b>AA</b>
          agent-assistant
        </Link>
        <div className="admin-login-copy">
          <p className="eyebrow">FOUNDER OPERATIONS</p>
          <h1>The private side of the agent economy.</h1>
          <p>
            Review demand, qualify early users and turn the waitlist into
            interviews, pilots and proof for YC.
          </p>
        </div>
        <AdminLoginForm
          returnTo={returnTo}
          configured={isPasswordAdminConfigured()}
        />
        <small>Private access · 12-hour secure session · No public indexing</small>
      </section>
    </main>
  );
}



