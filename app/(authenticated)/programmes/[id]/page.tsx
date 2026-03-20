import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/copy-link";

export default async function ProgrammeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!user.coachId) redirect("/dashboard");

  const [programmeResult, milestonesResult, enrollmentsResult] = await Promise.all([
    pool.query(
      "SELECT * FROM programmes WHERE id = $1 AND coach_id = $2",
      [id, user.coachId],
    ),
    pool.query(
      "SELECT * FROM milestones WHERE programme_id = $1 ORDER BY week_number",
      [id],
    ),
    pool.query(
      `SELECT e.id, e.status, e.start_date, e.end_date,
              c.first_name, c.last_name, c.email, c.id as client_id
       FROM enrollments e
       JOIN clients c ON c.id = e.client_id
       WHERE e.programme_id = $1 AND e.coach_id = $2
       ORDER BY e.created_at DESC`,
      [id, user.coachId],
    ),
  ]);

  if (programmeResult.rows.length === 0) notFound();

  const programme = programmeResult.rows[0];
  const milestones = milestonesResult.rows;
  const enrollments = enrollmentsResult.rows;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4050";

  const statusStyles: Record<string, string> = {
    ACTIVE: "bg-green-light text-green",
    DRAFT: "bg-amber-light text-amber",
    ARCHIVED: "bg-warm text-muted",
  };

  const enrollmentStatusStyles: Record<string, string> = {
    ACTIVE: "bg-green-light text-green",
    PENDING_PAYMENT: "bg-amber-light text-amber",
    COMPLETED: "bg-violet-light text-violet",
    CANCELLED: "bg-warm text-muted",
    REFUNDED: "bg-warm text-muted",
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/programmes"
          className="text-sm font-semibold text-violet hover:text-violet-dark"
        >
          &lsaquo; Back to programmes
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-text">{programme.name}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[programme.status] || ""}`}>
              {programme.status}
            </span>
          </div>
          {programme.description && <p className="mt-2 text-mid">{programme.description}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/programmes/${id}/edit`}
            className="rounded-[12px] border border-border bg-white px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-warm"
          >
            Edit
          </Link>
          <Link
            href={`/enrollments/new?programmeId=${id}`}
            className="rounded-[12px] bg-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
          >
            Enrol client
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--violet)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Duration</div>
          <div className="text-[22px] font-bold text-text">{programme.duration_weeks} weeks</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--green)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Base fee</div>
          <div className="text-[22px] font-bold text-text">£{(programme.base_fee_amount / 100).toFixed(2)}</div>
          <div className="mt-0.5 text-[10px] text-muted">3 instalments of £{(Math.floor(programme.base_fee_amount / 3) / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--amber)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Bonus pot</div>
          <div className="text-[22px] font-bold text-text">£{(programme.bonus_pot_amount / 100).toFixed(2)}</div>
          <div className="mt-0.5 text-[10px] text-muted">Released on milestone completion</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--violet)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Enrolled</div>
          <div className="text-[22px] font-bold text-text">{enrollments.length}</div>
          <div className="mt-0.5 text-[10px] text-muted">{enrollments.filter((e: any) => e.status === "ACTIVE").length} active</div>
        </div>
      </div>

      {/* Milestones */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Milestones ({milestones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No milestones defined for this programme.</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m: any) => {
                const evidence = typeof m.required_evidence === "string"
                  ? JSON.parse(m.required_evidence)
                  : m.required_evidence;
                return (
                  <div key={m.id} className="flex items-start gap-3 rounded-[10px] border border-border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-light text-xs font-bold text-violet">
                      W{m.week_number}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-text">{m.name}</div>
                      {m.description && <p className="mt-0.5 text-sm text-muted">{m.description}</p>}
                      <div className="mt-1 flex gap-2">
                        {(evidence as string[]).map((e: string) => (
                          <span key={e} className="rounded-full bg-warm px-2 py-0.5 text-[10px] font-semibold text-mid">
                            {e.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrolled clients */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enrolled clients ({enrollments.length})</CardTitle>
            <Link
              href={`/enrollments/new?programmeId=${id}`}
              className="text-sm font-semibold text-violet hover:text-violet-dark"
            >
              + Enrol client
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No clients enrolled yet.</p>
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-warm">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Start</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">End</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {enrollments.map((e: any) => (
                    <tr key={e.id} className="cursor-pointer transition-colors hover:bg-warm" onClick={undefined}>
                      <td className="px-4 py-2.5">
                        <Link href={`/enrollments/${e.id}`} className="block text-sm font-medium text-text">
                          {e.first_name} {e.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/enrollments/${e.id}`} className="block">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${enrollmentStatusStyles[e.status] || ""}`}>
                            {e.status.replace("_", " ")}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/enrollments/${e.id}`} className="block text-sm text-mid">
                          {new Date(e.start_date).toLocaleDateString("en-GB")}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/enrollments/${e.id}`} className="block text-sm text-mid">
                          {new Date(e.end_date).toLocaleDateString("en-GB")}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/enrollments/${e.id}`}
                          className="rounded-[8px] bg-violet px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-violet-dark"
                        >
                          View details
                        </Link>
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
