import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import { Card, CardContent } from "@/components/ui/card";
import { CopyLink } from "@/components/copy-link";

export default async function PaymentsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!user.coachId) redirect("/dashboard");

  const [paymentsResult, statsResult] = await Promise.all([
    pool.query(
      `SELECT pay.*,
              c.first_name as client_first_name, c.last_name as client_last_name,
              p.name as programme_name
       FROM payments pay
       JOIN enrollments e ON e.id = pay.enrollment_id
       JOIN clients c ON c.id = e.client_id
       JOIN programmes p ON p.id = e.programme_id
       WHERE e.coach_id = $1
       ORDER BY pay.scheduled_date DESC`,
      [user.coachId],
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'PAID'), 0) as total_collected,
         COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'SCHEDULED'), 0) as total_scheduled,
         COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'FAILED'), 0) as total_failed,
         COUNT(*) FILTER (WHERE pay.status = 'PAID') as paid_count,
         COUNT(*) FILTER (WHERE pay.status = 'SCHEDULED') as scheduled_count,
         COUNT(*) FILTER (WHERE pay.status = 'FAILED') as failed_count
       FROM payments pay
       JOIN enrollments e ON e.id = pay.enrollment_id
       WHERE e.coach_id = $1`,
      [user.coachId],
    ),
  ]);

  const payments = paymentsResult.rows;
  const stats = statsResult.rows[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4050";

  const paymentStatusStyles: Record<string, string> = {
    PAID: "bg-green-light text-green",
    SCHEDULED: "bg-warm text-mid",
    PENDING: "bg-amber-light text-amber",
    FAILED: "bg-red-50 text-red-600",
    REFUNDED: "bg-warm text-muted",
  };

  return (
    <div>
      <div>
        <h1 className="font-serif text-2xl font-bold text-text">Payments</h1>
        <p className="mt-1 text-mid">Track all payment activity across your programmes</p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--green)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Collected</div>
          <div className="text-[22px] font-bold text-text">£{(parseInt(stats.total_collected) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
          <div className="mt-0.5 text-[10px] text-muted">{stats.paid_count} payments</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--amber)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Scheduled</div>
          <div className="text-[22px] font-bold text-text">£{(parseInt(stats.total_scheduled) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
          <div className="mt-0.5 text-[10px] text-muted">{stats.scheduled_count} upcoming</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--red, #ef4444)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Failed</div>
          <div className="text-[22px] font-bold text-text">£{(parseInt(stats.total_failed) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
          <div className="mt-0.5 text-[10px] text-muted">{stats.failed_count} payments</div>
        </div>
      </div>

      {/* Payments table */}
      {payments.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <p className="text-muted">No payments yet. Payments will appear here once clients start paying.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[14px] border border-border bg-white">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-warm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Programme</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p: any) => (
                <tr key={p.id} className="transition-colors hover:bg-warm">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-mid">
                    {p.paid_at
                      ? new Date(p.paid_at).toLocaleDateString("en-GB")
                      : p.scheduled_date
                        ? new Date(p.scheduled_date).toLocaleDateString("en-GB")
                        : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text">
                    {p.client_first_name} {p.client_last_name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-mid">{p.programme_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-mid">
                    {p.type === "BASE_FEE" ? "Instalment" : p.type === "BONUS_POT" ? "Bonus pot" : "Platform fee"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text">
                    £{(p.amount / 100).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${paymentStatusStyles[p.status] || ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
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
    </div>
  );
}
