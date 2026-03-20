"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createBrowserClient } from "@/providers/supabase/browser-client";
import { cn } from "@/utils/cn";

interface MobileNavProps {
  userEmail: string;
  userName: string | null;
  businessName: string | null;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/programmes", label: "Programmes", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav({ userEmail, userName, businessName }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-white px-4 py-3 md:hidden">
        <button onClick={() => setOpen(true)} className="text-mid" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-serif text-lg font-bold text-text">
          <span className="text-violet">Fit</span>Pay
        </h1>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h1 className="font-serif text-xl font-bold text-text">
                <span className="text-violet">Fit</span>Pay
              </h1>
              <button onClick={() => setOpen(false)} className="text-mid" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {businessName && (
              <p className="px-6 pt-2 text-sm text-muted">{businessName}</p>
            )}

            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
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
        </div>
      )}
    </>
  );
}
