import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/copy-link";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!user.coachId) redirect("/dashboard");

  const [clientResult, enrollmentsResult, paymentsResult] = await Promise.all([
    pool.query(
      "SELECT * FROM clients WHERE id = $1 AND coach_id = $2",
      [id, user.coachId],
    ),
    pool.query(
      `SELECT e.id, e.status, e.start_date, e.end_date, e.base_fee_amount, e.bonus_pot_amount,
              p.name as programme_name, p.duration_weeks, p.id as programme_id,
              bp.status as bonus_pot_status, bp.id as bonus_pot_id
       FROM enrollments e
       JOIN programmes p ON p.id = e.programme_id
       LEFT JOIN bonus_pots bp ON bp.enrollment_id = e.id
       WHERE e.client_id = $1 AND e.coach_id = $2
       ORDER BY e.created_at DESC`,
      [id, user.coachId],
    ),
    pool.query(
      `SELECT pay.id, pay.amount, pay.currency, pay.type, pay.status, pay.scheduled_date, pay.paid_at,
              pay.enrollment_id, p.name as programme_name, e.status as enrollment_status
       FROM payments pay
       JOIN enrollments e ON e.id = pay.enrollment_id
       JOIN programmes p ON p.id = e.programme_id
       WHERE e.client_id = $1 AND e.coach_id = $2
       ORDER BY pay.scheduled_date ASC`,
      [id, user.coachId],
    ),
  ]);

  if (clientResult.rows.length === 0) notFound();

  const client = clientResult.rows[0];
  const enrollments = enrollmentsResult.rows;
  const payments = paymentsResult.rows;

  const totalPaid = payments
    .filter((p: any) => p.status === "PAID")
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalScheduled = payments
    .filter((p: any) => p.status === "SCHEDULED")
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4050";

  const enrollmentStatusStyles: Record<string, string> = {
    ACTIVE: "bg-green-light text-green",
    PENDING_PAYMENT: "bg-amber-light text-amber",
    COMPLETED: "bg-violet-light text-violet",
    CANCELLED: "bg-warm text-muted",
    REFUNDED: "bg-warm text-muted",
  };

  const paymentStatusStyles: Record<string, string> = {
    PAID: "bg-green-light text-green",
    SCHEDULED: "bg-warm text-mid",
    PENDING: "bg-amber-light text-amber",
    FAILED: "bg-red-50 text-red-600",
    REFUNDED: "bg-warm text-muted",
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/clients" className="text-sm font-semibold text-violet hover:text-violet-dark">
          &lsaquo; Back to clients
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">
            {client.first_name} {client.last_name}
          </h1>
          <p className="mt-1 text-mid">{client.email}</p>
          {client.phone && <p className="text-sm text-muted">{client.phone}</p>}
        </div>
        <Link
          href={`/enrollments/new?clientId=${id}`}
          className="rounded-[12px] bg-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
        >
          Enrol in programme
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--violet)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Enrollments</div>
          <div className="text-[22px] font-bold text-text">{enrollments.length}</div>
          <div className="mt-0.5 text-[10px] text-muted">{enrollments.filter((e: any) => e.status === "ACTIVE").length} active</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--green)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Paid</div>
          <div className="text-[22px] font-bold text-text">£{(totalPaid / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--amber)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Upcoming</div>
          <div className="text-[22px] font-bold text-text">£{(totalScheduled / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--violet)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Client since</div>
          <div className="text-lg font-bold text-text">{new Date(client.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</div>
        </div>
      </div>

      {/* Enrollments */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Enrollments ({enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No enrollments yet.</p>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e: any) => (
                <Link key={e.id} href={`/enrollments/${e.id}`} className="block rounded-[10px] border border-border p-4 transition-colors hover:border-violet hover:shadow-[0_2px_8px_rgba(124,58,237,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-text">
                        {e.programme_name}
                      </span>
                      <div className="mt-0.5 text-sm text-muted">
                        {new Date(e.start_date).toLocaleDateString("en-GB")} &ndash;{" "}
                        {new Date(e.end_date).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${enrollmentStatusStyles[e.status] || ""}`}>
                      {e.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm text-mid">
                    <span>Base: £{(e.base_fee_amount / 100).toFixed(2)}</span>
                    <span>Bonus: £{(e.bonus_pot_amount / 100).toFixed(2)}</span>
                    {e.bonus_pot_status && (
                      <span className="font-semibold">
                        Pot: {e.bonus_pot_status}
                      </span>
                    )}
                  </div>
                  {e.status === "PENDING_PAYMENT" && (
                    <div className="mt-3 rounded-[8px] bg-amber-light px-3 py-2 text-sm">
                      <span className="mb-1.5 block font-semibold text-amber">Checkout link</span>
                      <CopyLink url={`${appUrl}/checkout/${e.id}`} />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Payment history ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No payments yet.</p>
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-warm">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="transition-colors hover:bg-warm">
                      <td className="px-4 py-2.5 text-sm text-mid">
                        {p.paid_at
                          ? new Date(p.paid_at).toLocaleDateString("en-GB")
                          : p.scheduled_date
                            ? new Date(p.scheduled_date).toLocaleDateString("en-GB")
                            : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-mid">
                        {p.type === "BASE_FEE" ? "Instalment" : p.type === "BONUS_POT" ? "Bonus pot" : "Platform fee"}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-text">
                        £{(p.amount / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${paymentStatusStyles[p.status] || ""}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {p.status !== "PAID" && p.status !== "REFUNDED" && (
                          <CopyLink url={`${appUrl}/checkout/${p.enrollment_id}`} label="Copy checkout" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
