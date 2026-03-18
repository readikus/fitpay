import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";
import { createEnrollmentSchema } from "@/schemas/enrollment";
import { addWeeks } from "date-fns";

const INSTALMENT_COUNT = 3;

/**
 * GET /api/enrollments
 * List enrollments for the authenticated coach.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status");

  let query = `
    SELECT e.id, e.status, e.start_date, e.end_date, e.base_fee_amount, e.bonus_pot_amount, e.currency,
           c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email,
           p.name as programme_name, p.duration_weeks,
           bp.status as bonus_pot_status
    FROM enrollments e
    JOIN clients c ON c.id = e.client_id
    JOIN programmes p ON p.id = e.programme_id
    LEFT JOIN bonus_pots bp ON bp.enrollment_id = e.id
    WHERE e.coach_id = $1
  `;
  const values: unknown[] = [user.coachId];

  if (status) {
    query += ` AND e.status = $2`;
    values.push(status);
  }

  query += ` ORDER BY e.created_at DESC`;

  const result = await pool.query(query, values);
  return NextResponse.json({ enrollments: result.rows });
}

/**
 * POST /api/enrollments
 * Create an enrollment with payment schedule and bonus pot.
 *
 * Flow:
 * 1. Validate programme + client belong to coach
 * 2. Calculate end date and fees
 * 3. Create enrollment (PENDING_PAYMENT)
 * 4. Create bonus pot (HELD)
 * 5. Create 3 scheduled BASE_FEE payments + 1 BONUS_POT payment
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
  const parsed = createEnrollmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { programmeId, clientId, startDate, baseFeeAmount: feeOverride, bonusPotAmount: bonusOverride } = parsed.data;

  // Verify programme ownership and get details
  const programmeResult = await pool.query(
    "SELECT * FROM programmes WHERE id = $1 AND coach_id = $2 AND status != 'ARCHIVED'",
    [programmeId, user.coachId],
  );

  if (programmeResult.rows.length === 0) {
    return NextResponse.json({ error: "Programme not found or archived" }, { status: 404 });
  }

  // Verify client ownership
  const clientResult = await pool.query(
    "SELECT id FROM clients WHERE id = $1 AND coach_id = $2",
    [clientId, user.coachId],
  );

  if (clientResult.rows.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Check for existing active enrollment for this client + programme
  const existingEnrollment = await pool.query(
    "SELECT id FROM enrollments WHERE client_id = $1 AND programme_id = $2 AND status IN ('PENDING_PAYMENT', 'ACTIVE')",
    [clientId, programmeId],
  );

  if (existingEnrollment.rows.length > 0) {
    return NextResponse.json(
      { error: "Client already has an active enrollment in this programme" },
      { status: 409 },
    );
  }

  const programme = programmeResult.rows[0];
  const baseFee = feeOverride ?? programme.base_fee_amount;
  const bonusPot = bonusOverride ?? programme.bonus_pot_amount;
  const currency = programme.currency;
  const endDate = addWeeks(new Date(startDate), programme.duration_weeks).toISOString().split("T")[0];

  // Calculate instalment amounts (handle rounding)
  const instalmentBase = Math.floor(baseFee / INSTALMENT_COUNT);
  const instalmentRemainder = baseFee - instalmentBase * INSTALMENT_COUNT;
  const weeksPerInstalment = Math.floor(programme.duration_weeks / INSTALMENT_COUNT);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create enrollment
    const enrollmentResult = await client.query(
      `INSERT INTO enrollments (programme_id, client_id, coach_id, status, start_date, end_date,
                                 base_fee_amount, bonus_pot_amount, currency)
       VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4, $5, $6, $7, $8)
       RETURNING *`,
      [programmeId, clientId, user.coachId, startDate, endDate, baseFee, bonusPot, currency],
    );
    const enrollment = enrollmentResult.rows[0];

    // 2. Create bonus pot
    if (bonusPot > 0) {
      await client.query(
        `INSERT INTO bonus_pots (enrollment_id, amount, currency, status)
         VALUES ($1, $2, $3, 'HELD')`,
        [enrollment.id, bonusPot, currency],
      );
    }

    // 3. Create scheduled BASE_FEE payments (3 instalments)
    for (let i = 0; i < INSTALMENT_COUNT; i++) {
      const amount = i === INSTALMENT_COUNT - 1 ? instalmentBase + instalmentRemainder : instalmentBase;
      const scheduledDate = addWeeks(new Date(startDate), i * weeksPerInstalment)
        .toISOString()
        .split("T")[0];

      await client.query(
        `INSERT INTO payments (enrollment_id, amount, currency, type, status, scheduled_date)
         VALUES ($1, $2, $3, 'BASE_FEE', 'SCHEDULED', $4)`,
        [enrollment.id, amount, currency, scheduledDate],
      );
    }

    // 4. Create BONUS_POT payment (scheduled for start date)
    if (bonusPot > 0) {
      await client.query(
        `INSERT INTO payments (enrollment_id, amount, currency, type, status, scheduled_date)
         VALUES ($1, $2, $3, 'BONUS_POT', 'SCHEDULED', $4)`,
        [enrollment.id, bonusPot, currency, startDate],
      );
    }

    // 5. Activate programme if still in DRAFT
    if (programme.status === "DRAFT") {
      await client.query(
        "UPDATE programmes SET status = 'ACTIVE', updated_at = now() WHERE id = $1",
        [programmeId],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create enrollment:", err);
    return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 });
  } finally {
    client.release();
  }
}
