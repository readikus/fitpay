import { z } from "zod";

export const createMilestoneSubmissionSchema = z.object({
  notes: z.string().max(2000).optional(),
  evidence: z
    .array(
      z.object({
        evidenceType: z.enum(["PHOTO", "CHECK_IN", "ATTENDANCE"]),
        notes: z.string().max(1000).optional(),
      }),
    )
    .min(1, "At least one piece of evidence is required"),
});

export const reviewMilestoneSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(2000).optional(),
});

export type CreateMilestoneSubmissionInput = z.infer<typeof createMilestoneSubmissionSchema>;
export type ReviewMilestoneSubmissionInput = z.infer<typeof reviewMilestoneSubmissionSchema>;
