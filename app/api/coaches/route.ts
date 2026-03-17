import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";
import { createCoachSchema } from "@/schemas/coach";

/**
 * POST /api/coaches
 * Creates a coach profile for the authenticated user.
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.coachId) {
    return NextResponse.json({ error: "Coach profile already exists" }, { status: 409 });
  }

  const body = await request.json();
  const parsed = createCoachSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await pool.query(
    `INSERT INTO coaches (user_id, business_name)
     VALUES ($1, $2)
     RETURNING id, business_name, stripe_account_id, stripe_onboarding_complete, onboarding_complete`,
    [user.id, parsed.data.businessName],
  );

  return NextResponse.json({ coach: result.rows[0] }, { status: 201 });
}
