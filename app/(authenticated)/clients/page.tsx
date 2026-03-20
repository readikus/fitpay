import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function ClientsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!user.coachId) redirect("/dashboard");

  const result = await pool.query(
    `SELECT c.id, c.email, c.first_name, c.last_name, c.phone, c.created_at,
            COUNT(e.id) FILTER (WHERE e.status = 'ACTIVE') as active_enrollments
     FROM clients c
     LEFT JOIN enrollments e ON e.client_id = c.id
     WHERE c.coach_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [user.coachId],
  );

  const clients = result.rows;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">Clients</h1>
          <p className="mt-1 text-mid">Manage your coaching clients</p>
        </div>
        <Link
          href="/clients/new"
          className="w-fit rounded-[12px] bg-violet px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
        >
          Add client
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <p className="text-muted">No clients yet. Add your first client to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          <div className="overflow-hidden rounded-[14px] border border-border bg-white">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-warm">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted md:px-6">
                    Name
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted md:table-cell">
                    Email
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted lg:table-cell">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted md:px-6">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c: any) => (
                  <tr key={c.id} className="transition-colors hover:bg-warm">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium md:px-6">
                      <Link href={`/clients/${c.id}`} className="text-violet hover:text-violet-dark">
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-mid md:table-cell">{c.email}</td>
                    <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-mid lg:table-cell">
                      {c.phone || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-mid md:px-6">
                      {c.active_enrollments}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
