import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";
import { createAttendanceSchema } from "@/schemas/attendance";

/**
 * GET /api/enrollments/[id]/attendance
 * List attendance logs for an enrollment.
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

  // Verify enrollment belongs to coach
  const enrollment = await pool.query(
    "SELECT id FROM enrollments WHERE id = $1 AND coach_id = $2",
    [id, user.coachId],
  );
  if (enrollment.rows.length === 0) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  const result = await pool.query(
    "SELECT * FROM attendance_logs WHERE enrollment_id = $1 ORDER BY session_date DESC",
    [id],
  );

  return NextResponse.json({ attendance: result.rows });
}

/**
 * POST /api/enrollments/[id]/attendance
 * Log attendance for an enrollment session.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAttendanceSchema.safeParse({ ...body, enrollmentId: id });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Verify enrollment belongs to coach and is active
  const enrollment = await pool.query(
    "SELECT id FROM enrollments WHERE id = $1 AND coach_id = $2 AND status = 'ACTIVE'",
    [id, user.coachId],
  );
  if (enrollment.rows.length === 0) {
    return NextResponse.json({ error: "Active enrollment not found" }, { status: 404 });
  }

  try {
    const result = await pool.query(
      `INSERT INTO attendance_logs (enrollment_id, session_date, attended, notes, logged_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (enrollment_id, session_date) DO UPDATE
       SET attended = $3, notes = $4, logged_by = $5
       RETURNING *`,
      [id, parsed.data.sessionDate, parsed.data.attended, parsed.data.notes || null, user.id],
    );

    return NextResponse.json({ attendance: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Failed to log attendance:", err);
    return NextResponse.json({ error: "Failed to log attendance" }, { status: 500 });
  }
}
