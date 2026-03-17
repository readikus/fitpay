import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile and coach info.
 */
export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
