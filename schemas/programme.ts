import { z } from "zod";

/**
 * Form-facing schema — amounts in pounds (£), decimals allowed.
 * Used by React Hook Form in the browser.
 */
export const createProgrammeSchema = z.object({
  name: z.string().min(1, "Programme name is required").max(255),
  description: z.string().max(2000).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  baseFeeAmount: z.number().min(1, "Base fee must be at least £1.00"),
  bonusPotAmount: z.number().min(0).default(0),
  currency: z.string().default("gbp"),
  maxClients: z.number().int().min(1).optional(),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        weekNumber: z.number().int().min(1),
        requiredEvidence: z.array(z.enum(["PHOTO", "CHECK_IN", "ATTENDANCE"])),
      }),
    )
    .optional(),
});

/**
 * API-facing schema — amounts in pence (integer).
 * Used by API route handlers after form converts £ → pence.
 */
export const createProgrammeApiSchema = z.object({
  name: z.string().min(1, "Programme name is required").max(255),
  description: z.string().max(2000).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  baseFeeAmount: z.number().int().min(100, "Base fee must be at least £1.00"),
  bonusPotAmount: z.number().int().min(0),
  currency: z.string().default("gbp"),
  maxClients: z.number().int().min(1).optional(),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        weekNumber: z.number().int().min(1),
        requiredEvidence: z.array(z.enum(["PHOTO", "CHECK_IN", "ATTENDANCE"])),
      }),
    )
    .optional(),
});

export const updateProgrammeSchema = createProgrammeSchema.partial();
export const updateProgrammeApiSchema = createProgrammeApiSchema.partial();

export type CreateProgrammeInput = z.infer<typeof createProgrammeSchema>;
export type UpdateProgrammeInput = z.infer<typeof updateProgrammeSchema>;
