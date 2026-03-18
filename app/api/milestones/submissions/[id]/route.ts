import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";
import { reviewMilestoneSubmissionSchema } from "@/schemas/milestone-submission";

/**
 * PUT /api/milestones/submissions/[id]
 * Coach approves or rejects a milestone submission.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = reviewMilestoneSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Verify submission belongs to coach's enrollment
  const submissionResult = await pool.query(
    `SELECT ms.id, ms.status
     FROM milestone_submissions ms
     JOIN enrollments e ON e.id = ms.enrollment_id
     WHERE ms.id = $1 AND e.coach_id = $2`,
    [id, user.coachId],
  );

  if (submissionResult.rows.length === 0) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submissionResult.rows[0].status !== "PENDING") {
    return NextResponse.json(
      { error: "Submission has already been reviewed" },
      { status: 400 },
    );
  }

  const result = await pool.query(
    `UPDATE milestone_submissions
     SET status = $1, reviewed_at = now(), reviewed_by = $2, review_notes = $3
     WHERE id = $4
     RETURNING *`,
    [parsed.data.status, user.id, parsed.data.reviewNotes || null, id],
  );

  return NextResponse.json({ submission: result.rows[0] });
}
