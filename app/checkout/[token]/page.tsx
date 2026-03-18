import { pool } from "@/providers/database/pool";
import { notFound } from "next/navigation";
import { CheckoutActions } from "./checkout-actions";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const { token: enrollmentId } = await params;
  const { success, cancelled } = await searchParams;

  // Look up enrollment details (public route — no auth required)
  const enrollmentResult = await pool.query(
    `SELECT e.id, e.status, e.start_date, e.end_date, e.base_fee_amount, e.bonus_pot_amount, e.currency,
            c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email,
            p.name as programme_name, p.duration_weeks, p.description as programme_description,
            co.business_name
     FROM enrollments e
     JOIN clients c ON c.id = e.client_id
     JOIN programmes p ON p.id = e.programme_id
     JOIN coaches co ON co.id = e.coach_id
     WHERE e.id = $1`,
    [enrollmentId],
  );

  if (enrollmentResult.rows.length === 0) notFound();

  const enrollment = enrollmentResult.rows[0];

  // Get payment schedule
  const paymentsResult = await pool.query(
    `SELECT id, amount, currency, type, status, scheduled_date, paid_at
     FROM payments
     WHERE enrollment_id = $1
     ORDER BY scheduled_date ASC`,
    [enrollmentId],
  );

  const payments = paymentsResult.rows;
  const nextPayment = payments.find((p: any) => p.status === "SCHEDULED");
  const allPaid = payments.every((p: any) => p.status === "PAID");

  // Success state
  if (success === "true") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-light">
            <svg className="h-8 w-8 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold text-text">Payment successful!</h1>
          <p className="mt-2 text-mid">
            Your payment for <strong>{enrollment.programme_name}</strong> has been received.
          </p>
          <p className="mt-1 text-sm text-muted">
            You&apos;ll receive a confirmation email at {enrollment.client_email}
          </p>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (cancelled === "true") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-serif text-2xl font-bold text-text">Payment cancelled</h1>
          <p className="mt-2 text-mid">
            Your payment was not processed. You can try again when you&apos;re ready.
          </p>
          <a
            href={`/checkout/${enrollmentId}`}
            className="mt-4 inline-block rounded-[12px] bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  // All paid state
  if (allPaid && payments.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-light">
            <svg className="h-8 w-8 text-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold text-text">All paid up!</h1>
          <p className="mt-2 text-mid">
            All payments for <strong>{enrollment.programme_name}</strong> have been received.
          </p>
        </div>
      </div>
    );
  }

  const totalCost = enrollment.base_fee_amount + enrollment.bonus_pot_amount;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-serif text-xl font-bold text-text">
            <span className="text-violet">Fit</span>Pay
          </h1>
          {enrollment.business_name && (
            <p className="mt-1 text-sm text-muted">{enrollment.business_name}</p>
          )}
        </div>

        {/* Programme info */}
        <div className="mt-6 rounded-[14px] border border-border bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <h2 className="font-serif text-lg font-bold text-text">{enrollment.programme_name}</h2>
          {enrollment.programme_description && (
            <p className="mt-1 text-sm text-muted">{enrollment.programme_description}</p>
          )}

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-mid">
              <span>Duration</span>
              <span className="font-medium text-text">{enrollment.duration_weeks} weeks</span>
            </div>
            <div className="flex justify-between text-mid">
              <span>Start date</span>
              <span className="font-medium text-text">
                {new Date(enrollment.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-text">Payment schedule</h3>
            <div className="mt-2 space-y-2">
              {payments.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {p.status === "PAID" ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-light">
                        <svg className="h-3 w-3 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : p.status === "PENDING" ? (
                      <div className="h-5 w-5 animate-pulse rounded-full bg-amber-light" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    )}
                    <span className="text-mid">
                      {p.type === "BONUS_POT"
                        ? "Bonus pot"
                        : `Instalment ${payments.filter((pp: any) => pp.type === "BASE_FEE").indexOf(p) + 1}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`font-medium ${p.status === "PAID" ? "text-green" : "text-text"}`}>
                      £{(p.amount / 100).toFixed(2)}
                    </span>
                    <div className="text-[10px] text-muted">
                      {p.paid_at
                        ? `Paid ${new Date(p.paid_at).toLocaleDateString("en-GB")}`
                        : new Date(p.scheduled_date).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold text-text">
              <span>Total</span>
              <span>£{(totalCost / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Pay button */}
          {nextPayment && (
            <CheckoutActions
              enrollmentId={enrollmentId}
              paymentId={nextPayment.id}
              amount={nextPayment.amount}
              type={nextPayment.type}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Secured by Stripe. Your payment details are never stored on our servers.
        </p>
      </div>
    </div>
  );
}
