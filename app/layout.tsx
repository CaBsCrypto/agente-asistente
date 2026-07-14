import type { Metadata } from "next";
import "./globals.css";
import WebMcpRegistry from "./webmcp-registry";
import Providers from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://agente-asistente.vercel.app"),
  title: "agent-assistant | Agents act. You stay in control.",
  description:
    "A trilingual, non-custodial action and commerce layer for people, AI agents, developers and businesses.",
  openGraph: {
    title: "agent-assistant | Agents act. You stay in control.",
    description:
      "Build, publish and execute agent-ready actions through policy, explicit authority and durable receipts.",
    url: "https://agente-asistente.vercel.app",
    siteName: "agent-assistant",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "agent-assistant action flow" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "agent-assistant | Agents act. You stay in control.",
    description:
      "A non-custodial action layer for the agent economy.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const appId =
    process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ||
    process.env.PRIVY_APP_ID?.trim();
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim();

  return (
    <html lang="en">
      <body>
        <Providers appId={appId} clientId={clientId}>
          <WebMcpRegistry />
          {children}
        </Providers>
      </body>
    </html>
  );
}