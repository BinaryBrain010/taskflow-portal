"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  SheetRoot,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const FEED_NAV: { href: string; label: string }[] = [
  { href: "/feed", label: "Task feed" },
  { href: "/feed/my-tasks", label: "My tasks" },
];

/** Task filter tabs — design-system styled, not stock NavigationMenu */
const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "claimed", label: "Claimed" },
] as const;

function UserAvatar({ name, className }: { name: string; className?: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground",
        className
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}

export function WorkerShell({
  children,
  filterTab,
  onFilterChange,
}: {
  children: React.ReactNode;
  filterTab?: string;
  onFilterChange?: (id: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(filterTab ?? "all");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      clearSession();
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (filterTab != null) setActiveFilter(filterTab);
  }, [filterTab]);

  const handleFilter = (id: string) => {
    setActiveFilter(id);
    onFilterChange?.(id);
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top navbar — mobile-first */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <SheetRoot open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={true} className="flex flex-col p-0">
            <SheetHeader className="border-sidebar-border">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SheetBody className="flex flex-1 flex-col gap-4 p-4">
              {FEED_NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium",
                    pathname === href
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  {label}
                </Link>
              ))}
              <div className="mt-auto border-t border-sidebar-border pt-4">
                <div className="flex items-center gap-3 pb-3">
                  <UserAvatar name={user.name} />
                  <div>
                    <p className="text-sm font-medium text-sidebar-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    clearSession();
                    logout();
                    router.replace("/login");
                  }}
                >
                  Sign out
                </Button>
              </div>
            </SheetBody>
          </SheetContent>
        </SheetRoot>

        <Link href="/feed" className="font-display text-lg font-semibold text-foreground md:mr-4">
          TaskFlow
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden gap-1 md:flex">
          {FEED_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <UserAvatar name={user.name} className="size-8" />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              clearSession();
              logout();
              router.replace("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      {/* Task filter tabs — design-system tabs, not stock nav menu */}
      <div className="border-b border-border bg-muted/30 px-4 py-2">
        <div
          className="flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label="Task filter"
        >
          {FILTER_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeFilter === id}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeFilter === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => handleFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
