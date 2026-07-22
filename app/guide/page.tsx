import GuideClient from "./guide-client";

export const metadata = {
  title: "New user guide | Carmelita",
  description:
    "Learn how to meet Carmelita, activate a Stellar Testnet wallet and prepare your first safe action from chat.",
};

export default function GuidePage() {
  return <GuideClient />;
}