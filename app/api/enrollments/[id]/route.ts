import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";

/**
 * GET /api/enrollments/[id]
 * Get enrollment detail with payments, milestones, bonus pot, and attendance.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  const enrollmentResult = await pool.query(
    `SELECT e.*,
            c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email,
            p.name as programme_name, p.duration_weeks, p.description as programme_description
     FROM enrollments e
     JOIN clients c ON c.id = e.client_id
     JOIN programmes p ON p.id = e.programme_id
     WHERE e.id = $1 AND e.coach_id = $2`,
    [id, user.coachId],
  );

  if (enrollmentResult.rows.length === 0) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  const [paymentsResult, bonusPotResult, milestonesResult, attendanceResult] = await Promise.all([
    pool.query(
      "SELECT * FROM payments WHERE enrollment_id = $1 ORDER BY scheduled_date ASC",
      [id],
    ),
    pool.query(
      "SELECT * FROM bonus_pots WHERE enrollment_id = $1",
      [id],
    ),
    pool.query(
      `SELECT m.*, ms.id as submission_id, ms.status as submission_status, ms.submitted_at, ms.reviewed_at, ms.review_notes
       FROM milestones m
       LEFT JOIN milestone_submissions ms ON ms.milestone_id = m.id AND ms.enrollment_id = $1
       WHERE m.programme_id = $2
       ORDER BY m.week_number`,
      [id, enrollmentResult.rows[0].programme_id],
    ),
    pool.query(
      "SELECT * FROM attendance_logs WHERE enrollment_id = $1 ORDER BY session_date DESC",
      [id],
    ),
  ]);

  return NextResponse.json({
    enrollment: {
      ...enrollmentResult.rows[0],
      payments: paymentsResult.rows,
      bonusPot: bonusPotResult.rows[0] || null,
      milestones: milestonesResult.rows,
      attendance: attendanceResult.rows,
    },
  });
}

/**
 * PUT /api/enrollments/[id]
 * Update enrollment status (complete, cancel).
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
  const { status } = body;

  const validTransitions: Record<string, string[]> = {
    PENDING_PAYMENT: ["CANCELLED"],
    ACTIVE: ["COMPLETED", "CANCELLED"],
  };

  // Get current enrollment
  const current = await pool.query(
    "SELECT status FROM enrollments WHERE id = $1 AND coach_id = $2",
    [id, user.coachId],
  );

  if (current.rows.length === 0) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  const currentStatus = current.rows[0].status;
  const allowed = validTransitions[currentStatus];

  if (!allowed || !allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${currentStatus} to ${status}` },
      { status: 400 },
    );
  }

  const result = await pool.query(
    "UPDATE enrollments SET status = $1, updated_at = now() WHERE id = $2 AND coach_id = $3 RETURNING *",
    [status, id, user.coachId],
  );

  return NextResponse.json({ enrollment: result.rows[0] });
}
