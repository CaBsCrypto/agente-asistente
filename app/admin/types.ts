import { z } from "zod";

export const waitlistStatuses = [
  "waiting",
  "contacted",
  "interviewed",
  "pilot",
  "accepted",
  "declined",
] as const;

export const waitlistPriorities = ["high", "normal", "low"] as const;

export const adminUpdateSchema = z
  .object({
    status: z.enum(waitlistStatuses).optional(),
    priority: z.enum(waitlistPriorities).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    owner: z.string().trim().max(120).nullable().optional(),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(10)
      .transform((tags) => [...new Set(tags)])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export type WaitlistStatus = (typeof waitlistStatuses)[number];
export type WaitlistPriority = (typeof waitlistPriorities)[number];

export type AdminWaitlistSignup = {
  id: string;
  email: string;
  role: string;
  useCase: string;
  country: string | null;
  company: string | null;
  source: string;
  referral: string | null;
  status: string;
  priority: string;
  notes: string | null;
  owner: string | null;
  tags: string[];
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
