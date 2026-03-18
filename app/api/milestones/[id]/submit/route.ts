import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/providers/database/pool";
import { createMilestoneSubmissionSchema } from "@/schemas/milestone-submission";

/**
 * POST /api/milestones/[id]/submit
 * Submit evidence for a milestone. Used by clients.
 *
 * Body: { enrollmentId: string, notes?: string, evidence: [{ evidenceType, notes? }] }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: milestoneId } = await params;
  const body = await request.json();
  const { enrollmentId, ...submissionData } = body;

  if (!enrollmentId) {
    return NextResponse.json({ error: "enrollmentId is required" }, { status: 400 });
  }

  const parsed = createMilestoneSubmissionSchema.safeParse(submissionData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Verify milestone exists and enrollment is active
  const milestoneResult = await pool.query(
    `SELECT m.id, m.required_evidence
     FROM milestones m
     JOIN enrollments e ON e.programme_id = m.programme_id
     WHERE m.id = $1 AND e.id = $2 AND e.status = 'ACTIVE'`,
    [milestoneId, enrollmentId],
  );

  if (milestoneResult.rows.length === 0) {
    return NextResponse.json(
      { error: "Milestone not found or enrollment is not active" },
      { status: 404 },
    );
  }

  // Check for existing submission
  const existingSubmission = await pool.query(
    "SELECT id FROM milestone_submissions WHERE milestone_id = $1 AND enrollment_id = $2",
    [milestoneId, enrollmentId],
  );

  if (existingSubmission.rows.length > 0) {
    return NextResponse.json(
      { error: "Evidence has already been submitted for this milestone" },
      { status: 409 },
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create submission
    const submissionResult = await client.query(
      `INSERT INTO milestone_submissions (milestone_id, enrollment_id, status, submitted_at)
       VALUES ($1, $2, 'PENDING', now())
       RETURNING *`,
      [milestoneId, enrollmentId],
    );
    const submission = submissionResult.rows[0];

    // Create evidence records
    for (const ev of parsed.data.evidence) {
      await client.query(
        `INSERT INTO milestone_evidence (submission_id, evidence_type, notes, metadata)
         VALUES ($1, $2, $3, '{}')`,
        [submission.id, ev.evidenceType, ev.notes || null],
      );
    }

    await client.query("COMMIT");

    // Fetch evidence for response
    const evidenceResult = await pool.query(
      "SELECT * FROM milestone_evidence WHERE submission_id = $1",
      [submission.id],
    );

    return NextResponse.json(
      { submission: { ...submission, evidence: evidenceResult.rows } },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to submit milestone:", err);
    return NextResponse.json({ error: "Failed to submit milestone evidence" }, { status: 500 });
  } finally {
    client.release();
  }
}
