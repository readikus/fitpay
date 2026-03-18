import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";
import { updateClientSchema } from "@/schemas/client";

/**
 * GET /api/clients/[id]
 * Get a single client with their enrollment history.
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

  const clientResult = await pool.query(
    "SELECT * FROM clients WHERE id = $1 AND coach_id = $2",
    [id, user.coachId],
  );

  if (clientResult.rows.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const enrollmentsResult = await pool.query(
    `SELECT e.id, e.status, e.start_date, e.end_date, e.base_fee_amount, e.bonus_pot_amount,
            p.name as programme_name, p.duration_weeks,
            bp.status as bonus_pot_status, bp.amount as bonus_pot_held
     FROM enrollments e
     JOIN programmes p ON p.id = e.programme_id
     LEFT JOIN bonus_pots bp ON bp.enrollment_id = e.id
     WHERE e.client_id = $1 AND e.coach_id = $2
     ORDER BY e.created_at DESC`,
    [id, user.coachId],
  );

  const paymentsResult = await pool.query(
    `SELECT pay.id, pay.amount, pay.currency, pay.type, pay.status, pay.scheduled_date, pay.paid_at
     FROM payments pay
     JOIN enrollments e ON e.id = pay.enrollment_id
     WHERE e.client_id = $1 AND e.coach_id = $2
     ORDER BY pay.scheduled_date ASC`,
    [id, user.coachId],
  );

  return NextResponse.json({
    client: {
      ...clientResult.rows[0],
      enrollments: enrollmentsResult.rows,
      payments: paymentsResult.rows,
    },
  });
}

/**
 * PUT /api/clients/[id]
 * Update a client's details.
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
  const parsed = updateClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (parsed.data.firstName !== undefined) { updates.push(`first_name = $${idx++}`); values.push(parsed.data.firstName); }
  if (parsed.data.lastName !== undefined) { updates.push(`last_name = $${idx++}`); values.push(parsed.data.lastName); }
  if (parsed.data.email !== undefined) { updates.push(`email = $${idx++}`); values.push(parsed.data.email); }
  if (parsed.data.phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(parsed.data.phone); }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.push(`updated_at = now()`);

  const result = await pool.query(
    `UPDATE clients SET ${updates.join(", ")} WHERE id = $${idx} AND coach_id = $${idx + 1} RETURNING *`,
    [...values, id, user.coachId],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client: result.rows[0] });
}

/**
 * DELETE /api/clients/[id]
 * Delete a client. Cannot delete if active enrollments exist.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  const activeEnrollments = await pool.query(
    "SELECT COUNT(*) as count FROM enrollments WHERE client_id = $1 AND status = 'ACTIVE'",
    [id],
  );

  if (parseInt(activeEnrollments.rows[0].count) > 0) {
    return NextResponse.json(
      { error: "Cannot delete client with active enrollments" },
      { status: 409 },
    );
  }

  const result = await pool.query(
    "DELETE FROM clients WHERE id = $1 AND coach_id = $2 RETURNING id",
    [id, user.coachId],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
