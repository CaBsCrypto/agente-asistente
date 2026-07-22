import assert from "node:assert/strict";
import test from "node:test";
import { integrationRecommendationSchema } from "../app/integrations/schema";

test("integration recommendation normalizes a valid submission", () => {
  const result = integrationRecommendationSchema.parse({
    integrationName: "  Google Calendar  ",
    email: " Founder@Example.com ",
    useCase: "Schedule meetings from the chat.",
    locale: "es",
    source: "landing",
    consent: true,
    website: "",
  });

  assert.equal(result.integrationName, "Google Calendar");
  assert.equal(result.email, "founder@example.com");
  assert.equal(result.locale, "es");
  assert.equal(result.website, undefined);
});

test("integration recommendation requires an email and consent", () => {
  const result = integrationRecommendationSchema.safeParse({
    integrationName: "Notion",
    email: "not-an-email",
    locale: "en",
    consent: false,
  });

  assert.equal(result.success, false);
});

test("integration recommendation accepts a minimal request", () => {
  const result = integrationRecommendationSchema.parse({
    integrationName: "Slack",
    email: "person@example.com",
    consent: true,
  });
  assert.equal(result.source, "landing");
});
