import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  // If no coach profile yet, show onboarding prompt
  if (!user.coachId) {
    return (
      <div>
        <h1 className="font-serif text-2xl font-bold text-text">Welcome to FitPay</h1>
        <p className="mt-2 text-mid">
          Complete your coach profile to get started.
        </p>
        <a
          href="/settings"
          className="mt-4 inline-block rounded-[12px] bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
        >
          Set up profile
        </a>
      </div>
    );
  }

  // Fetch dashboard stats
  const [programmesResult, clientsResult, enrollmentsResult, earningsResult] = await Promise.all([
    pool.query(
      "SELECT COUNT(*) as count FROM programmes WHERE coach_id = $1 AND status = 'ACTIVE'",
      [user.coachId],
    ),
    pool.query("SELECT COUNT(*) as count FROM clients WHERE coach_id = $1", [user.coachId]),
    pool.query(
      "SELECT COUNT(*) as count FROM enrollments WHERE coach_id = $1 AND status = 'ACTIVE'",
      [user.coachId],
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE enrollment_id IN (SELECT id FROM enrollments WHERE coach_id = $1)
         AND status = 'PAID' AND type = 'BASE_FEE'`,
      [user.coachId],
    ),
  ]);

  const stats = {
    activeProgrammes: parseInt(programmesResult.rows[0]?.count || "0"),
    totalClients: parseInt(clientsResult.rows[0]?.count || "0"),
    activeEnrollments: parseInt(enrollmentsResult.rows[0]?.count || "0"),
    totalEarnings: parseFloat(earningsResult.rows[0]?.total || "0"),
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-text">Dashboard</h1>
      <p className="mt-1 text-mid">
        {user.businessName || "Your coaching business"} overview
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-violet hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Active Programmes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-black text-text">{stats.activeProgrammes}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-violet hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-black text-text">{stats.totalClients}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-violet hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Active Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-black text-text">{stats.activeEnrollments}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-violet hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-black text-violet">
              £{(stats.totalEarnings / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
