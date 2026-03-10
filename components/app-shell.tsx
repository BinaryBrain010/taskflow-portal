"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

interface AppShellProps {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function AppShell({ title, navItems, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      clearSession();
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="border-border flex w-full flex-col border-b md:h-screen md:w-56 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4 md:border-b">
          <Link href={navItems[0]?.href ?? "/"} className="font-display text-lg font-semibold text-foreground">
            {title}
          </Link>
        </div>
        <nav className="flex flex-1 flex-row gap-1 overflow-x-auto p-2 md:flex-col md:overflow-x-visible md:p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-border flex h-14 items-center justify-between gap-4 border-b px-4">
          <div className="min-w-0 flex-1" />
          <div className="flex items-center gap-2">
            <span className="truncate text-sm text-muted-foreground">
              {user?.name ?? user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
