"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({
  children,
  appId,
  clientId,
}: {
  children: React.ReactNode;
  appId?: string;
  clientId?: string;
}) {
  if (!appId) return children;

  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId || undefined}
      config={{
        loginMethods: ["email", "google", "passkey"],
        appearance: {
          theme: "light",
          accentColor: "#ff5b3a",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}