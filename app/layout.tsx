import type { Metadata } from "next";
import "./globals.css";
import WebMcpRegistry from "./webmcp-registry";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "agent-assistant | Control for agents that take action",
  description: "Non-custodial commerce infrastructure for AI agents.",
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