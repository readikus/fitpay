import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";
import { updateProgrammeApiSchema } from "@/schemas/programme";

/**
 * GET /api/programmes/[id]
 * Get a programme with its milestones.
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

  const programmeResult = await pool.query(
    "SELECT * FROM programmes WHERE id = $1 AND coach_id = $2",
    [id, user.coachId],
  );

  if (programmeResult.rows.length === 0) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }

  const milestonesResult = await pool.query(
    "SELECT * FROM milestones WHERE programme_id = $1 ORDER BY week_number",
    [id],
  );

  const enrollmentsResult = await pool.query(
    `SELECT e.id, e.status, e.start_date, e.end_date,
            c.first_name, c.last_name, c.email
     FROM enrollments e
     JOIN clients c ON c.id = e.client_id
     WHERE e.programme_id = $1 AND e.coach_id = $2
     ORDER BY e.created_at DESC`,
    [id, user.coachId],
  );

  return NextResponse.json({
    programme: {
      ...programmeResult.rows[0],
      milestones: milestonesResult.rows,
      enrollments: enrollmentsResult.rows,
    },
  });
}

/**
 * PUT /api/programmes/[id]
 * Update a programme. Milestones are replaced if provided.
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
  const parsed = updateProgrammeApiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Verify ownership
  const existing = await pool.query(
    "SELECT id, status FROM programmes WHERE id = $1 AND coach_id = $2",
    [id, user.coachId],
  );

  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }

  const { name, description, durationWeeks, baseFeeAmount, bonusPotAmount, currency, maxClients, milestones } =
    parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Build dynamic SET clause for only provided fields
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (durationWeeks !== undefined) { updates.push(`duration_weeks = $${idx++}`); values.push(durationWeeks); }
    if (baseFeeAmount !== undefined) { updates.push(`base_fee_amount = $${idx++}`); values.push(baseFeeAmount); }
    if (bonusPotAmount !== undefined) { updates.push(`bonus_pot_amount = $${idx++}`); values.push(bonusPotAmount); }
    if (currency !== undefined) { updates.push(`currency = $${idx++}`); values.push(currency); }
    if (maxClients !== undefined) { updates.push(`max_clients = $${idx++}`); values.push(maxClients); }

    if (updates.length > 0) {
      updates.push(`updated_at = now()`);
      await client.query(
        `UPDATE programmes SET ${updates.join(", ")} WHERE id = $${idx} AND coach_id = $${idx + 1}`,
        [...values, id, user.coachId],
      );
    }

    // Replace milestones if provided
    if (milestones !== undefined) {
      await client.query("DELETE FROM milestones WHERE programme_id = $1", [id]);
      for (const m of milestones) {
        await client.query(
          `INSERT INTO milestones (programme_id, name, description, week_number, required_evidence)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, m.name, m.description || null, m.weekNumber, JSON.stringify(m.requiredEvidence)],
        );
      }
    }

    await client.query("COMMIT");

    // Fetch updated programme with milestones
    const programmeResult = await pool.query("SELECT * FROM programmes WHERE id = $1", [id]);
    const milestonesResult = await pool.query(
      "SELECT * FROM milestones WHERE programme_id = $1 ORDER BY week_number",
      [id],
    );

    return NextResponse.json({
      programme: { ...programmeResult.rows[0], milestones: milestonesResult.rows },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to update programme:", err);
    return NextResponse.json({ error: "Failed to update programme" }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/programmes/[id]
 * Archive a programme (soft delete). Cannot delete if active enrollments exist.
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

  // Check for active enrollments
  const activeEnrollments = await pool.query(
    "SELECT COUNT(*) as count FROM enrollments WHERE programme_id = $1 AND status = 'ACTIVE'",
    [id],
  );

  if (parseInt(activeEnrollments.rows[0].count) > 0) {
    return NextResponse.json(
      { error: "Cannot archive programme with active enrollments" },
      { status: 409 },
    );
  }

  const result = await pool.query(
    `UPDATE programmes SET status = 'ARCHIVED', updated_at = now()
     WHERE id = $1 AND coach_id = $2
     RETURNING id`,
    [id, user.coachId],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
