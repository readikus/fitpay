import { NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "@/providers/database/pool";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/payments/reconcile
 *
 * Finds payments stuck in PENDING status and checks their actual state on Stripe.
 * Handles missed webhooks — safe to run on a cron or manually.
 *
 * Protected by a simple secret to prevent abuse.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const secret = body.secret || request.headers.get("x-reconcile-secret");

  if (secret !== process.env.RECONCILE_SECRET && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find payments in PENDING status with a Stripe payment intent ID
  const { rows: pendingPayments } = await pool.query(
    `SELECT id, stripe_payment_intent_id, enrollment_id
     FROM payments
     WHERE status = 'PENDING' AND stripe_payment_intent_id IS NOT NULL`,
  );

  const results = { checked: 0, paid: 0, failed: 0, unchanged: 0 };

  for (const payment of pendingPayments) {
    results.checked++;

    try {
      const pi = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

      if (pi.status === "succeeded") {
        await pool.query(
          "UPDATE payments SET status = 'PAID', paid_at = now() WHERE id = $1",
          [payment.id],
        );
        // Activate enrollment if it's still pending
        await pool.query(
          "UPDATE enrollments SET status = 'ACTIVE', updated_at = now() WHERE id = $1 AND status = 'PENDING_PAYMENT'",
          [payment.enrollment_id],
        );
        results.paid++;
      } else if (pi.status === "canceled" || pi.status === "requires_payment_method") {
        // Payment was abandoned or failed — revert to SCHEDULED so client can retry
        await pool.query(
          "UPDATE payments SET status = 'SCHEDULED', stripe_payment_intent_id = NULL WHERE id = $1",
          [payment.id],
        );
        results.failed++;
      } else {
        results.unchanged++;
      }
    } catch (err) {
      console.error(`Reconcile: failed to check payment ${payment.id}:`, err);
      results.unchanged++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
