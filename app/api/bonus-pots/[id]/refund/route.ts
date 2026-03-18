import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/bonus-pots/[id]/refund
 * Refund a held bonus pot back to the client.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.coachId) {
    return NextResponse.json({ error: "Coach profile required" }, { status: 403 });
  }

  // Verify bonus pot belongs to coach and is in HELD status
  const bonusPotResult = await pool.query(
    `SELECT bp.*, pay.stripe_payment_intent_id
     FROM bonus_pots bp
     JOIN enrollments e ON e.id = bp.enrollment_id
     LEFT JOIN payments pay ON pay.enrollment_id = bp.enrollment_id AND pay.type = 'BONUS_POT' AND pay.status = 'PAID'
     WHERE bp.id = $1 AND e.coach_id = $2 AND bp.status = 'HELD'`,
    [id, user.coachId],
  );

  if (bonusPotResult.rows.length === 0) {
    return NextResponse.json({ error: "Bonus pot not found or not in HELD status" }, { status: 404 });
  }

  const bonusPot = bonusPotResult.rows[0];

  try {
    // If there's a Stripe payment intent, create a refund
    if (bonusPot.stripe_payment_intent_id) {
      await stripe.refunds.create({
        payment_intent: bonusPot.stripe_payment_intent_id,
        metadata: {
          fitpay_bonus_pot_id: id,
          fitpay_enrollment_id: bonusPot.enrollment_id,
        },
      });
    }

    await pool.query(
      `UPDATE bonus_pots SET status = 'REFUNDED', refunded_at = now() WHERE id = $1`,
      [id],
    );

    // Update the bonus pot payment record
    await pool.query(
      `UPDATE payments SET status = 'REFUNDED'
       WHERE enrollment_id = $1 AND type = 'BONUS_POT' AND status = 'PAID'`,
      [bonusPot.enrollment_id],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to refund bonus pot:", err);
    return NextResponse.json({ error: "Failed to refund bonus pot" }, { status: 500 });
  }
}
