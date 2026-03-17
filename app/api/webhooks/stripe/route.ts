import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "@/providers/database/pool";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * POST /api/webhooks/stripe
 * Handles Stripe Connect webhook events for payment processing.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(paymentIntent);
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await handleAccountUpdate(account);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  await pool.query(
    `UPDATE payments SET status = 'PAID', paid_at = now()
     WHERE stripe_payment_intent_id = $1`,
    [paymentIntent.id],
  );

  // Update enrollment status if this is the first payment
  const result = await pool.query(
    `SELECT enrollment_id FROM payments WHERE stripe_payment_intent_id = $1`,
    [paymentIntent.id],
  );

  if (result.rows.length > 0) {
    await pool.query(
      `UPDATE enrollments SET status = 'ACTIVE', updated_at = now()
       WHERE id = $1 AND status = 'PENDING_PAYMENT'`,
      [result.rows[0].enrollment_id],
    );
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  await pool.query(
    `UPDATE payments SET status = 'FAILED'
     WHERE stripe_payment_intent_id = $1`,
    [paymentIntent.id],
  );
}

async function handleAccountUpdate(account: Stripe.Account) {
  const isComplete = account.charges_enabled && account.payouts_enabled;
  await pool.query(
    `UPDATE coaches SET stripe_onboarding_complete = $1, updated_at = now()
     WHERE stripe_account_id = $2`,
    [isComplete, account.id],
  );
}
