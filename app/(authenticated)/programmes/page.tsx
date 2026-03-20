import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function ProgrammesPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!user.coachId) redirect("/dashboard");

  const result = await pool.query(
    `SELECT id, name, description, duration_weeks, base_fee_amount, bonus_pot_amount,
            currency, status, max_clients, created_at
     FROM programmes
     WHERE coach_id = $1
     ORDER BY created_at DESC`,
    [user.coachId],
  );

  const programmes = result.rows;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">Programmes</h1>
          <p className="mt-1 text-mid">Manage your coaching programmes</p>
        </div>
        <Link
          href="/programmes/new"
          className="w-fit rounded-[12px] bg-violet px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
        >
          Create programme
        </Link>
      </div>

      {programmes.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <p className="text-muted">No programmes yet. Create your first programme to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4">
          {programmes.map((p: any) => (
            <Link key={p.id} href={`/programmes/${p.id}`}>
            <Card className="hover:border-violet hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      p.status === "ACTIVE"
                        ? "bg-green-light text-green"
                        : p.status === "DRAFT"
                          ? "bg-amber-light text-amber"
                          : "bg-warm text-muted"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 text-sm text-mid md:gap-6">
                  <span>{p.duration_weeks} weeks</span>
                  <span>Base: £{(p.base_fee_amount / 100).toFixed(2)}</span>
                  <span>Bonus pot: £{(p.bonus_pot_amount / 100).toFixed(2)}</span>
                  {p.max_clients && <span>Max: {p.max_clients} clients</span>}
                </div>
                {p.description && (
                  <p className="mt-2 text-sm text-muted">{p.description}</p>
                )}
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
