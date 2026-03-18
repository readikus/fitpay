import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MilestoneReview } from "./milestone-review";
import { AttendanceForm } from "./attendance-form";
import { EnrollmentActions } from "./enrollment-actions";

function getCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!user.coachId) redirect("/dashboard");

  const enrollmentResult = await pool.query(
    `SELECT e.*,
            c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email, c.id as client_id,
            p.name as programme_name, p.duration_weeks, p.description as programme_description, p.id as programme_id
     FROM enrollments e
     JOIN clients c ON c.id = e.client_id
     JOIN programmes p ON p.id = e.programme_id
     WHERE e.id = $1 AND e.coach_id = $2`,
    [id, user.coachId],
  );

  if (enrollmentResult.rows.length === 0) notFound();

  const enrollment = enrollmentResult.rows[0];

  const [paymentsResult, bonusPotResult, milestonesResult, attendanceResult] = await Promise.all([
    pool.query(
      "SELECT * FROM payments WHERE enrollment_id = $1 ORDER BY scheduled_date ASC",
      [id],
    ),
    pool.query(
      "SELECT * FROM bonus_pots WHERE enrollment_id = $1",
      [id],
    ),
    pool.query(
      `SELECT m.*, ms.id as submission_id, ms.status as submission_status,
              ms.submitted_at, ms.reviewed_at, ms.review_notes
       FROM milestones m
       LEFT JOIN milestone_submissions ms ON ms.milestone_id = m.id AND ms.enrollment_id = $1
       WHERE m.programme_id = $2
       ORDER BY m.week_number`,
      [id, enrollment.programme_id],
    ),
    pool.query(
      "SELECT * FROM attendance_logs WHERE enrollment_id = $1 ORDER BY session_date DESC",
      [id],
    ),
  ]);

  const payments = paymentsResult.rows;
  const bonusPot = bonusPotResult.rows[0] || null;
  const milestones = milestonesResult.rows;
  const attendance = attendanceResult.rows;

  const currentWeek = getCurrentWeek(enrollment.start_date);
  const cappedWeek = Math.min(currentWeek, enrollment.duration_weeks);
  const progressPct = Math.round((cappedWeek / enrollment.duration_weeks) * 100);

  const totalPaid = payments
    .filter((p: any) => p.status === "PAID")
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalDue = payments
    .filter((p: any) => p.status === "SCHEDULED" || p.status === "PENDING")
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const approvedMilestones = milestones.filter((m: any) => m.submission_status === "APPROVED").length;
  const pendingReview = milestones.filter((m: any) => m.submission_status === "PENDING").length;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4050";

  const statusStyles: Record<string, string> = {
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
      {/* Breadcrumb */}
      <div className="mb-6 flex gap-2 text-sm">
        <Link href={`/clients/${enrollment.client_id}`} className="font-semibold text-violet hover:text-violet-dark">
          {enrollment.client_first_name} {enrollment.client_last_name}
        </Link>
        <span className="text-muted">/</span>
        <span className="text-mid">{enrollment.programme_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-text">
              {enrollment.client_first_name} {enrollment.client_last_name}
            </h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[enrollment.status] || ""}`}>
              {enrollment.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-mid">
            <Link href={`/programmes/${enrollment.programme_id}`} className="hover:text-violet">
              {enrollment.programme_name}
            </Link>
            {" "}&middot;{" "}
            {new Date(enrollment.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {" — "}
            {new Date(enrollment.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        {enrollment.status === "ACTIVE" && (
          <EnrollmentActions
            enrollmentId={id}
            currentStatus={enrollment.status}
            bonusPotId={bonusPot?.id}
            bonusPotStatus={bonusPot?.status}
            allMilestonesApproved={milestones.length > 0 && approvedMilestones === milestones.length}
          />
        )}
      </div>

      {/* Checkout link for pending enrollments */}
      {enrollment.status === "PENDING_PAYMENT" && (
        <div className="mt-4 rounded-[12px] bg-amber-light px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber">Awaiting payment</p>
              <p className="mt-0.5 text-xs text-mid">Share this link with your client to collect their first payment.</p>
            </div>
            <code className="rounded-[8px] bg-white px-3 py-1.5 text-xs text-text">{appUrl}/checkout/{id}</code>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--violet)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Progress</div>
          <div className="text-[22px] font-bold text-text">Week {cappedWeek}/{enrollment.duration_weeks}</div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-violet" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--green)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Paid</div>
          <div className="text-[22px] font-bold text-text">£{(totalPaid / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--amber)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Outstanding</div>
          <div className="text-[22px] font-bold text-text">£{(totalDue / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid var(--violet)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Milestones</div>
          <div className="text-[22px] font-bold text-text">{approvedMilestones}/{milestones.length}</div>
          {pendingReview > 0 && <div className="mt-0.5 text-[10px] font-semibold text-amber">{pendingReview} awaiting review</div>}
        </div>
        {bonusPot && (
          <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderLeft: `3px solid ${bonusPot.status === "RELEASED" ? "var(--green)" : "var(--amber)"}` }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Bonus pot</div>
            <div className="text-[22px] font-bold text-text">£{(bonusPot.amount / 100).toFixed(2)}</div>
            <div className="mt-0.5 text-[10px] text-muted">{bonusPot.status}</div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Left column: Milestones + Attendance */}
        <div className="space-y-6">
          {/* Milestones */}
          <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-bold text-text">Milestones</div>
              <p className="text-xs text-muted">Review client submissions and approve milestones</p>
            </div>
            {milestones.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">
                No milestones defined for this programme.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {milestones.map((m: any) => {
                  const evidence = typeof m.required_evidence === "string"
                    ? JSON.parse(m.required_evidence)
                    : m.required_evidence;
                  const isDue = currentWeek >= m.week_number;

                  return (
                    <div key={m.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className="mt-0.5">
                          {m.submission_status === "APPROVED" ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-light">
                              <svg className="h-3.5 w-3.5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : m.submission_status === "REJECTED" ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50">
                              <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          ) : m.submission_status === "PENDING" ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-light">
                              <div className="h-2 w-2 rounded-full bg-amber" />
                            </div>
                          ) : isDue ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber bg-amber-light">
                              <span className="text-[9px] font-bold text-amber">!</span>
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-border" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-text">{m.name}</span>
                            <span className="text-[11px] text-muted">Week {m.week_number}</span>
                          </div>
                          {m.description && (
                            <p className="mt-0.5 text-xs text-muted">{m.description}</p>
                          )}
                          <div className="mt-1 flex gap-1.5">
                            {(evidence as string[]).map((e: string) => (
                              <span key={e} className="rounded-full bg-warm px-2 py-0.5 text-[9px] font-semibold text-mid">
                                {e.replace("_", " ")}
                              </span>
                            ))}
                          </div>

                          {/* Submission status + review */}
                          {m.submission_status === "PENDING" && m.submission_id && (
                            <MilestoneReview
                              submissionId={m.submission_id}
                              milestoneName={m.name}
                              submittedAt={m.submitted_at}
                            />
                          )}
                          {m.submission_status === "APPROVED" && (
                            <p className="mt-2 text-xs text-green">
                              Approved {m.reviewed_at && new Date(m.reviewed_at).toLocaleDateString("en-GB")}
                              {m.review_notes && ` — ${m.review_notes}`}
                            </p>
                          )}
                          {m.submission_status === "REJECTED" && (
                            <p className="mt-2 text-xs text-red-500">
                              Rejected {m.reviewed_at && new Date(m.reviewed_at).toLocaleDateString("en-GB")}
                              {m.review_notes && ` — ${m.review_notes}`}
                            </p>
                          )}
                          {!m.submission_id && isDue && enrollment.status === "ACTIVE" && (
                            <p className="mt-2 text-xs font-semibold text-amber">Due — awaiting client submission</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance */}
          {enrollment.status === "ACTIVE" && (
            <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="border-b border-border px-4 py-3">
                <div className="text-sm font-bold text-text">Attendance</div>
                <p className="text-xs text-muted">Log session attendance for this client</p>
              </div>
              <div className="p-4">
                <AttendanceForm enrollmentId={id} existingDates={attendance.map((a: any) => a.session_date)} />
              </div>
              {attendance.length > 0 && (
                <div className="border-t border-border">
                  <div className="divide-y divide-border">
                    {attendance.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {a.attended ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-light">
                              <svg className="h-3 w-3 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50">
                              <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          )}
                          <span className="text-sm text-text">
                            {new Date(a.session_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${a.attended ? "text-green" : "text-red-500"}`}>
                            {a.attended ? "Present" : "Absent"}
                          </span>
                          {a.notes && <span className="text-xs text-muted">&middot; {a.notes}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Payments */}
        <div>
          <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-bold text-text">Payment schedule</div>
              <p className="text-xs text-muted">
                £{((enrollment.base_fee_amount + enrollment.bonus_pot_amount) / 100).toFixed(2)} total
                {" "}&middot;{" "}3 instalments + bonus pot
              </p>
            </div>
            <div className="divide-y divide-border">
              {payments.map((p: any, i: number) => {
                const isBaseFee = p.type === "BASE_FEE";
                const baseFeeIndex = isBaseFee
                  ? payments.filter((pp: any) => pp.type === "BASE_FEE").indexOf(p) + 1
                  : null;

                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warm text-xs font-bold text-mid">
                        {isBaseFee ? baseFeeIndex : "B"}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-text">
                          {isBaseFee ? `Instalment ${baseFeeIndex}` : "Bonus pot"}
                        </div>
                        <div className="text-[11px] text-muted">
                          {p.paid_at
                            ? `Paid ${new Date(p.paid_at).toLocaleDateString("en-GB")}`
                            : p.scheduled_date
                              ? `Due ${new Date(p.scheduled_date).toLocaleDateString("en-GB")}`
                              : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">£{(p.amount / 100).toFixed(2)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${paymentStatusStyles[p.status] || ""}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
