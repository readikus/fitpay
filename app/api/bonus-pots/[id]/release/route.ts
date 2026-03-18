import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { pool } from "@/providers/database/pool";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/bonus-pots/[id]/release
 * Release a held bonus pot — transfers funds to coach's Stripe Connect account.
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
    `SELECT bp.*, co.stripe_account_id
     FROM bonus_pots bp
     JOIN enrollments e ON e.id = bp.enrollment_id
     JOIN coaches co ON co.id = e.coach_id
     WHERE bp.id = $1 AND e.coach_id = $2 AND bp.status = 'HELD'`,
    [id, user.coachId],
  );

  if (bonusPotResult.rows.length === 0) {
    return NextResponse.json({ error: "Bonus pot not found or not in HELD status" }, { status: 404 });
  }

  const bonusPot = bonusPotResult.rows[0];

  // Check all milestones are approved for this enrollment
  const pendingMilestones = await pool.query(
    `SELECT COUNT(*) as count
     FROM milestones m
     JOIN enrollments e ON e.programme_id = m.programme_id
     LEFT JOIN milestone_submissions ms ON ms.milestone_id = m.id AND ms.enrollment_id = e.id
     WHERE e.id = $1 AND (ms.id IS NULL OR ms.status != 'APPROVED')`,
    [bonusPot.enrollment_id],
  );

  if (parseInt(pendingMilestones.rows[0].count) > 0) {
    return NextResponse.json(
      { error: "All milestones must be approved before releasing the bonus pot" },
      { status: 400 },
    );
  }

  try {
    // Create a Stripe Transfer to coach's Connect account
    let transferId: string | null = null;
    if (bonusPot.stripe_account_id) {
      const transfer = await stripe.transfers.create({
        amount: bonusPot.amount,
        currency: bonusPot.currency,
        destination: bonusPot.stripe_account_id,
        metadata: {
          fitpay_bonus_pot_id: id,
          fitpay_enrollment_id: bonusPot.enrollment_id,
        },
      });
      transferId = transfer.id;
    }

    await pool.query(
      `UPDATE bonus_pots SET status = 'RELEASED', stripe_transfer_id = $1, released_at = now()
       WHERE id = $2`,
      [transferId, id],
    );

    return NextResponse.json({ success: true, transferId });
  } catch (err) {
    console.error("Failed to release bonus pot:", err);
    return NextResponse.json({ error: "Failed to release bonus pot" }, { status: 500 });
  }
}
