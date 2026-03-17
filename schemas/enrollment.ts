import { z } from "zod";

export const createEnrollmentSchema = z.object({
  programmeId: z.string().uuid(),
  clientId: z.string().uuid(),
  startDate: z.string().date(),
  baseFeeAmount: z.number().int().min(100).optional(),
  bonusPotAmount: z.number().int().min(0).optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
