import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";
import { createClientSchema } from "@/schemas/client";

/**
 * GET /api/clients
 * List clients for the authenticated coach.
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
    `SELECT id, email, first_name, last_name, phone, created_at
     FROM clients
     WHERE coach_id = $1
     ORDER BY created_at DESC`,
    [user.coachId],
  );

  return NextResponse.json({ clients: result.rows });
}

/**
 * POST /api/clients
 * Creates a client for the authenticated coach.
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
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Check for duplicate email under this coach
  const existing = await pool.query(
    "SELECT id FROM clients WHERE coach_id = $1 AND email = $2",
    [user.coachId, parsed.data.email],
  );

  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: "A client with this email already exists" },
      { status: 409 },
    );
  }

  const result = await pool.query(
    `INSERT INTO clients (coach_id, email, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, phone, created_at`,
    [user.coachId, parsed.data.email, parsed.data.firstName, parsed.data.lastName, parsed.data.phone || null],
  );

  return NextResponse.json({ client: result.rows[0] }, { status: 201 });
}
