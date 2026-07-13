import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const waitlistSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum([
    "individual",
    "merchant",
    "agent-builder",
    "partner",
    "investor",
  ]),
  useCase: z.enum([
    "travel",
    "local-services",
    "digital-work",
    "onchain-finance",
    "merchant-tools",
    "agent-integrations",
    "other",
  ]),
  country: optionalText(80),
  company: optionalText(120),
  source: optionalText(80).default("website"),
  referral: optionalText(120),
  consent: z.literal(true),
  website: optionalText(200),
});

export type WaitlistSignup = z.infer<typeof waitlistSignupSchema>;