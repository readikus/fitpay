import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { QueryProvider } from "@/components/query-provider";
import { Sidebar } from "@/components/sidebar";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getAuthenticatedUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const displayName =
    [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(" ") || null;

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar
        userEmail={sessionUser.email}
        userName={displayName}
        businessName={sessionUser.businessName}
        coachId={sessionUser.coachId}
      />
      <main className="flex-1 overflow-y-auto">
        <QueryProvider>
          <div className="p-8">{children}</div>
        </QueryProvider>
      </main>
    </div>
  );
}
