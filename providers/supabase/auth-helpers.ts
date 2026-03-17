import { createServerClient } from "@/providers/supabase/client";
import { SessionUser } from "@/types/auth";
import { pool } from "@/providers/database/pool";

/**
 * Get the authenticated Supabase user from the current session.
 * Uses supabase.auth.getUser() (not getSession()) per Supabase best practices.
 */
export async function getSupabaseUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  return { id: user.id, email: user.email };
}

/**
 * Get the full session user with coach profile for the current request.
 * Combines Supabase auth check with local database user lookup.
 */
export async function getAuthenticatedUser(): Promise<SessionUser | null> {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;

  // Look up local user and coach profile
  const result = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name,
            c.id as coach_id, c.business_name, c.stripe_account_id,
            c.stripe_onboarding_complete, c.onboarding_complete
     FROM users u
     LEFT JOIN coaches c ON c.user_id = u.id
     WHERE u.supabase_auth_id = $1`,
    [supabaseUser.id],
  );

  if (result.rows.length === 0) {
    // First login - create local user (or return existing if race condition)
    const insertResult = await pool.query(
      `INSERT INTO users (email, supabase_auth_id)
       VALUES ($1, $2)
       ON CONFLICT (supabase_auth_id) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email, first_name, last_name`,
      [supabaseUser.email, supabaseUser.id],
    );
    const row = insertResult.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      coachId: null,
      businessName: null,
      stripeAccountId: null,
      stripeOnboardingComplete: false,
      onboardingComplete: false,
    };
  }

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    coachId: row.coach_id,
    businessName: row.business_name,
    stripeAccountId: row.stripe_account_id,
    stripeOnboardingComplete: row.stripe_onboarding_complete ?? false,
    onboardingComplete: row.onboarding_complete ?? false,
  };
}
