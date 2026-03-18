import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";
import { createProgrammeApiSchema } from "@/schemas/programme";

/**
 * GET /api/programmes
 * List programmes for the authenticated coach.
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  const result = await pool.query(
    `SELECT id, name, description, duration_weeks, base_fee_amount, bonus_pot_amount,
            currency, status, max_clients, created_at
     FROM programmes
     WHERE coach_id = $1
     ORDER BY created_at DESC`,
    [user.coachId],
  );

  return NextResponse.json({ programmes: result.rows });
}

/**
 * POST /api/programmes
 * Create a programme with optional milestones for the authenticated coach.
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProgrammeApiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, description, durationWeeks, baseFeeAmount, bonusPotAmount, currency, maxClients, milestones } =
    parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const programmeResult = await client.query(
      `INSERT INTO programmes (coach_id, name, description, duration_weeks, base_fee_amount, bonus_pot_amount, currency, max_clients, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
       RETURNING *`,
      [user.coachId, name, description || null, durationWeeks, baseFeeAmount, bonusPotAmount, currency, maxClients || null],
    );

    const programme = programmeResult.rows[0];

    if (milestones && milestones.length > 0) {
      for (const m of milestones) {
        await client.query(
          `INSERT INTO milestones (programme_id, name, description, week_number, required_evidence)
           VALUES ($1, $2, $3, $4, $5)`,
          [programme.id, m.name, m.description || null, m.weekNumber, JSON.stringify(m.requiredEvidence)],
        );
      }
    }

    await client.query("COMMIT");

    // Fetch milestones for the response
    const milestonesResult = await pool.query(
      "SELECT * FROM milestones WHERE programme_id = $1 ORDER BY week_number",
      [programme.id],
    );

    return NextResponse.json(
      { programme: { ...programme, milestones: milestonesResult.rows } },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create programme:", err);
    return NextResponse.json({ error: "Failed to create programme" }, { status: 500 });
  } finally {
    client.release();
  }
}
