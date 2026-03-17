import { z } from "zod";

export const createCoachSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(255),
});

export type CreateCoachInput = z.infer<typeof createCoachSchema>;
