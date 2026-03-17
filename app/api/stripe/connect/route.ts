import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4050";

/**
 * POST /api/stripe/connect
 * Creates a Stripe Connect Express account (or retrieves existing) and returns an onboarding link.
 */
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.coachId) {
    return NextResponse.json({ error: "Create a coach profile first" }, { status: 400 });
  }

  let stripeAccountId = user.stripeAccountId;

  // Create a new Stripe Connect Express account if one doesn't exist
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      metadata: {
        fitpay_coach_id: user.coachId,
        fitpay_user_id: user.id,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    stripeAccountId = account.id;

    await pool.query(
      `UPDATE coaches SET stripe_account_id = $1, updated_at = now() WHERE id = $2`,
      [stripeAccountId, user.coachId],
    );
  }

  // Create an account link for onboarding (or re-onboarding)
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/settings?stripe=refresh`,
    return_url: `${appUrl}/settings?stripe=complete`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
