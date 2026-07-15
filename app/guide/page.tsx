import GuideClient from "./guide-client";

export const metadata = {
  title: "New user guide | agent-assistant",
  description:
    "Learn how to create your agent, activate a Stellar Testnet wallet and prepare your first safe action from chat.",
};

export default function GuidePage() {
  return <GuideClient />;
}