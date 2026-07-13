import assert from "node:assert/strict";
import test from "node:test";
import { waitlistSignupSchema } from "../app/waitlist/schema";

test("waitlist normalizes email and optional fields", () => {
  const result = waitlistSignupSchema.parse({
    email: " Founder@Example.COM ",
    role: "merchant",
    useCase: "merchant-tools",
    country: "  Chile ",
    company: "",
    source: "website",
    referral: "",
    consent: true,
    website: "",
  });

  assert.equal(result.email, "founder@example.com");
  assert.equal(result.country, "Chile");
  assert.equal(result.company, undefined);
});

test("waitlist requires explicit consent and valid categories", () => {
  const result = waitlistSignupSchema.safeParse({
    email: "person@example.com",
    role: "unknown",
    useCase: "travel",
    consent: false,
  });

  assert.equal(result.success, false);
});