import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const integrationRecommendationSchema = z.object({
  integrationName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  useCase: optionalText(500),
  locale: z.enum(["en", "es", "pt"]).default("en"),
  source: optionalText(80).default("landing"),
  consent: z.literal(true),
  website: optionalText(200),
});

export type IntegrationRecommendation = z.infer<
  typeof integrationRecommendationSchema
>;
