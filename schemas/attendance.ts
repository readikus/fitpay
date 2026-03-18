import { z } from "zod";

export const createAttendanceSchema = z.object({
  enrollmentId: z.string().uuid(),
  sessionDate: z.string().date(),
  attended: z.boolean(),
  notes: z.string().max(500).optional(),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
