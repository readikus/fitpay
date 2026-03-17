"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, FileText, Settings, LogOut } from "lucide-react";
import { createBrowserClient } from "@/providers/supabase/browser-client";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

interface SidebarProps {
  userEmail: string;
  userName: string | null;
  businessName: string | null;
  coachId: string | null;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/programmes", label: "Programmes", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ userEmail, userName, businessName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-white">
      <div className="border-b border-border p-6">
        <h1 className="font-serif text-xl font-bold text-text">
          <span className="text-violet">Fit</span>Pay
        </h1>
        {businessName && <p className="mt-1 text-sm text-muted">{businessName}</p>}
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-light text-violet-dark"
                  : "text-mid hover:bg-warm hover:text-text",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-text">{userName || "Coach"}</p>
          <p className="text-xs text-muted">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-mid hover:bg-warm hover:text-text"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
