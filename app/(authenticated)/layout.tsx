import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { QueryProvider } from "@/components/query-provider";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

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
      <div className="hidden md:flex">
        <Sidebar
          userEmail={sessionUser.email}
          userName={displayName}
          businessName={sessionUser.businessName}
          coachId={sessionUser.coachId}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileNav
          userEmail={sessionUser.email}
          userName={displayName}
          businessName={sessionUser.businessName}
        />
        <main className="flex-1 overflow-y-auto">
          <QueryProvider>
            <div className="p-4 md:p-8">{children}</div>
          </QueryProvider>
        </main>
      </div>
    </div>
  );
}
