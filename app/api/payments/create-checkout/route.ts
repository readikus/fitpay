import { NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "@/providers/database/pool";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4050";

/**
 * POST /api/payments/create-checkout
 * Creates a Stripe Checkout Session for a scheduled payment.
 * Public route — used from the client checkout page (no auth required).
 *
 * Body: { paymentId: string, enrollmentId: string }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { paymentId, enrollmentId } = body;

  if (!paymentId || !enrollmentId) {
    return NextResponse.json({ error: "paymentId and enrollmentId are required" }, { status: 400 });
  }

  // Look up payment and enrollment details
  const result = await pool.query(
    `SELECT pay.id as payment_id, pay.amount, pay.currency, pay.type, pay.status as payment_status,
            e.id as enrollment_id, e.coach_id,
            c.email as client_email, c.first_name as client_first_name,
            p.name as programme_name,
            co.stripe_account_id, co.stripe_onboarding_complete
     FROM payments pay
     JOIN enrollments e ON e.id = pay.enrollment_id
     JOIN clients c ON c.id = e.client_id
     JOIN programmes p ON p.id = e.programme_id
     JOIN coaches co ON co.id = e.coach_id
     WHERE pay.id = $1 AND e.id = $2`,
    [paymentId, enrollmentId],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const row = result.rows[0];

  if (row.payment_status !== "SCHEDULED") {
    return NextResponse.json({ error: "Payment is not in SCHEDULED status" }, { status: 400 });
  }

  if (!row.stripe_account_id || !row.stripe_onboarding_complete) {
    return NextResponse.json({ error: "Coach has not completed Stripe setup" }, { status: 400 });
  }

  // Calculate 1% platform fee
  const applicationFee = Math.round(row.amount * 0.01);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: row.client_email,
      line_items: [
        {
          price_data: {
            currency: row.currency,
            product_data: {
              name: `${row.programme_name} — ${row.type === "BONUS_POT" ? "Bonus Pot" : "Instalment"}`,
              description: `Payment for ${row.programme_name}`,
            },
            unit_amount: row.amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: row.stripe_account_id,
        },
        metadata: {
          fitpay_payment_id: paymentId,
          fitpay_enrollment_id: enrollmentId,
        },
      },
      success_url: `${appUrl}/checkout/${enrollmentId}?success=true`,
      cancel_url: `${appUrl}/checkout/${enrollmentId}?cancelled=true`,
      metadata: {
        fitpay_payment_id: paymentId,
        fitpay_enrollment_id: enrollmentId,
      },
    });

    // Update payment status to PENDING and store the payment intent ID
    await pool.query(
      `UPDATE payments SET status = 'PENDING', stripe_payment_intent_id = $1
       WHERE id = $2`,
      [session.payment_intent, paymentId],
    );

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Failed to create checkout session:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
