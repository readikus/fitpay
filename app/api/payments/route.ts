import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";

/**
 * GET /api/payments
 * List payments for the authenticated coach with optional filters.
 * Query params: status, type, from, to
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = `
    SELECT pay.*,
           e.start_date as enrollment_start,
           c.first_name as client_first_name, c.last_name as client_last_name,
           p.name as programme_name
    FROM payments pay
    JOIN enrollments e ON e.id = pay.enrollment_id
    JOIN clients c ON c.id = e.client_id
    JOIN programmes p ON p.id = e.programme_id
    WHERE e.coach_id = $1
  `;
  const values: unknown[] = [user.coachId];
  let idx = 2;

  if (status) {
    query += ` AND pay.status = $${idx++}`;
    values.push(status);
  }
  if (type) {
    query += ` AND pay.type = $${idx++}`;
    values.push(type);
  }
  if (from) {
    query += ` AND pay.scheduled_date >= $${idx++}`;
    values.push(from);
  }
  if (to) {
    query += ` AND pay.scheduled_date <= $${idx++}`;
    values.push(to);
  }

  query += ` ORDER BY pay.scheduled_date DESC`;

  const result = await pool.query(query, values);

  // Summary stats
  const statsResult = await pool.query(
    `SELECT
       COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'PAID'), 0) as total_collected,
       COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'SCHEDULED'), 0) as total_scheduled,
       COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'FAILED'), 0) as total_failed,
       COUNT(*) FILTER (WHERE pay.status = 'SCHEDULED') as upcoming_count
     FROM payments pay
     JOIN enrollments e ON e.id = pay.enrollment_id
     WHERE e.coach_id = $1`,
    [user.coachId],
  );

  return NextResponse.json({
    payments: result.rows,
    stats: statsResult.rows[0],
  });
}
