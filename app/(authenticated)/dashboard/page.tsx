import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import Link from "next/link";

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
}) {
  return (
    <div
      className="min-w-[130px] flex-1 rounded-[12px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="text-[22px] font-bold text-text">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    "on-track": { bg: "bg-green-light", text: "text-green", label: "On track" },
    "at-risk": { bg: "bg-amber-light", text: "text-amber", label: "At risk" },
    released: { bg: "bg-violet-light", text: "text-violet", label: "Released" },
    pending: { bg: "bg-surface", text: "text-muted", label: "Pending" },
    completed: { bg: "bg-violet-light", text: "text-violet", label: "Completed" },
    active: { bg: "bg-green-light", text: "text-green", label: "Active" },
  };
  const s = styles[status] || { bg: "bg-surface", text: "text-muted", label: status };
  return (
    <span
      className={`${s.bg} ${s.text} whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold`}
    >
      {s.label}
    </span>
  );
}

function ProgressBar({
  current,
  total,
  color = "var(--violet)",
}: {
  current: number;
  total: number;
  color?: string;
}) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="min-w-[32px] text-[11px] text-muted">{pct}%</span>
    </div>
  );
}

function Avatar({ initials, size = 30 }: { initials: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[10px] font-bold text-white"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
}

function getBonusDisplayStatus(bonusPotStatus: string | null): string {
  if (!bonusPotStatus) return "pending";
  if (bonusPotStatus === "RELEASED") return "released";
  if (bonusPotStatus === "REFUNDED") return "completed";
  return "on-track"; // HELD
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  if (!user.coachId) {
    return (
      <div>
        <h1 className="font-serif text-2xl font-bold text-text">Welcome to FitPay</h1>
        <p className="mt-2 text-mid">Complete your coach profile to get started.</p>
        <a
          href="/settings"
          className="mt-4 inline-block rounded-[12px] bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
        >
          Set up profile
        </a>
      </div>
    );
  }

  // Fetch all dashboard data in parallel
  const [
    activeClientsResult,
    completedCountResult,
    revenueResult,
    bonusOnTrackResult,
    bonusReleasedResult,
    clientsWithEnrollmentsResult,
    programmesResult,
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(DISTINCT e.client_id) as count
       FROM enrollments e WHERE e.coach_id = $1 AND e.status = 'ACTIVE'`,
      [user.coachId],
    ),
    pool.query(
      `SELECT COUNT(DISTINCT e.client_id) as count
       FROM enrollments e WHERE e.coach_id = $1 AND e.status = 'COMPLETED'`,
      [user.coachId],
    ),
    pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       JOIN enrollments e ON e.id = p.enrollment_id
       WHERE e.coach_id = $1 AND p.status = 'PAID' AND p.type = 'BASE_FEE'`,
      [user.coachId],
    ),
    pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(bp.amount), 0) as total
       FROM bonus_pots bp
       JOIN enrollments e ON e.id = bp.enrollment_id
       WHERE e.coach_id = $1 AND bp.status = 'HELD'`,
      [user.coachId],
    ),
    pool.query(
      `SELECT COALESCE(SUM(bp.amount), 0) as total
       FROM bonus_pots bp
       JOIN enrollments e ON e.id = bp.enrollment_id
       WHERE e.coach_id = $1 AND bp.status = 'RELEASED'`,
      [user.coachId],
    ),
    pool.query(
      `SELECT c.id, c.first_name, c.last_name,
              e.id as enrollment_id, e.start_date, e.status as enrollment_status,
              p.name as programme_name, p.duration_weeks,
              bp.status as bonus_status
       FROM enrollments e
       JOIN clients c ON c.id = e.client_id
       JOIN programmes p ON p.id = e.programme_id
       LEFT JOIN bonus_pots bp ON bp.enrollment_id = e.id
       WHERE e.coach_id = $1 AND e.status = 'ACTIVE'
       ORDER BY e.start_date DESC`,
      [user.coachId],
    ),
    pool.query(
      `SELECT p.id, p.name, p.base_fee_amount, p.bonus_pot_amount, p.duration_weeks,
              COUNT(e.id) FILTER (WHERE e.status = 'ACTIVE') as active_count
       FROM programmes p
       LEFT JOIN enrollments e ON e.programme_id = p.id
       WHERE p.coach_id = $1 AND p.status = 'ACTIVE'
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [user.coachId],
    ),
  ]);

  const activeClients = parseInt(activeClientsResult.rows[0]?.count || "0");
  const completedClients = parseInt(completedCountResult.rows[0]?.count || "0");
  const totalRevenue = parseInt(revenueResult.rows[0]?.total || "0");
  const bonusOnTrack = parseInt(bonusOnTrackResult.rows[0]?.count || "0");
  const bonusReleased = parseInt(bonusReleasedResult.rows[0]?.total || "0");
  const clientRows = clientsWithEnrollmentsResult.rows;
  const programmeRows = programmesResult.rows;

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active clients"
          value={activeClients}
          accent="var(--violet)"
          sub={`${completedClients} completed`}
        />
        <StatCard
          label="Revenue"
          value={`£${(totalRevenue / 100).toLocaleString("en-GB")}`}
          accent="var(--green)"
          sub="Base fees collected"
        />
        <StatCard
          label="Bonus pots"
          value={bonusOnTrack}
          accent="var(--amber)"
          sub="on track to release"
        />
        <StatCard
          label="Released"
          value={`£${(bonusReleased / 100).toLocaleString("en-GB")}`}
          accent="var(--violet)"
          sub="bonus pot earnings"
        />
      </div>

      {/* Active clients list */}
      <div className="mt-5 overflow-hidden rounded-[14px] border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="border-b border-border px-4 py-3 text-sm font-bold text-text">
          Active clients
        </div>
        {clientRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">
            No active enrollments yet.{" "}
            <Link href="/clients" className="font-semibold text-violet hover:text-violet-dark">
              Add a client
            </Link>{" "}
            and enrol them in a programme.
          </div>
        ) : (
          clientRows.map((cl: any) => {
            const week = getCurrentWeek(cl.start_date);
            const cappedWeek = Math.min(week, cl.duration_weeks);
            const initials = getInitials(cl.first_name, cl.last_name);
            const bonusDisplay = getBonusDisplayStatus(cl.bonus_status);
            const barColor =
              bonusDisplay === "at-risk" ? "var(--amber)" : "var(--violet)";

            return (
              <Link
                key={cl.enrollment_id}
                href={`/enrollments/${cl.enrollment_id}`}
                className="flex items-center gap-2.5 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-warm"
              >
                <Avatar initials={initials} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">
                    {cl.first_name} {cl.last_name}
                  </div>
                  <div className="text-[11px] text-muted">
                    {cl.programme_name} &ndash; Week {cappedWeek}/{cl.duration_weeks}
                  </div>
                </div>
                <div className="hidden w-28 sm:block">
                  <ProgressBar
                    current={cappedWeek}
                    total={cl.duration_weeks}
                    color={barColor}
                  />
                </div>
                <Badge status={bonusDisplay} />
              </Link>
            );
          })
        )}
      </div>

      {/* Programmes list */}
      <div className="mt-4 overflow-hidden rounded-[14px] border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="border-b border-border px-4 py-3 text-sm font-bold text-text">
          Your programmes
        </div>
        {programmeRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">
            No active programmes.{" "}
            <Link
              href="/programmes/new"
              className="font-semibold text-violet hover:text-violet-dark"
            >
              Create your first programme
            </Link>{" "}
            to get started.
          </div>
        ) : (
          programmeRows.map((pr: any) => {
            const total = (pr.base_fee_amount + pr.bonus_pot_amount) / 100;
            const bonus = pr.bonus_pot_amount / 100;
            const active = parseInt(pr.active_count || "0");

            return (
              <Link
                key={pr.id}
                href={`/programmes/${pr.id}`}
                className="flex items-center gap-2.5 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-warm"
              >
                <div
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] text-sm"
                  style={{
                    background: "linear-gradient(135deg, #D97706, #F59E0B)",
                  }}
                >
                  🏋️
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">
                    {pr.name}
                  </div>
                  <div className="text-[11px] text-muted">
                    £{total} total (£{bonus} bonus pot)
                  </div>
                </div>
                <span className="text-[13px] font-bold text-text">
                  {active} active
                </span>
                <span className="text-lg text-muted">&rsaquo;</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
