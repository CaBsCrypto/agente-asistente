import { requireAdminPage } from "@/app/admin/auth";
import { listServiceProviders } from "@/app/services/provider-store";
import ProviderAdmin from "./provider-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Service providers | agent-assistant",
  description: "Provision scoped MCP access for service providers.",
  robots: { index: false, follow: false },
};

export default async function ProvidersPage() {
  await requireAdminPage("/admin/providers");
  const providers = await listServiceProviders();
  return <ProviderAdmin initialProviders={providers} />;
}
