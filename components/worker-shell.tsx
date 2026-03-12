"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Menu,
  Home,
  CheckSquare,
  DollarSign,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button, buttonVariants } from "@/components/ui/button";
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

const BOTTOM_NAV = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/feed/my-tasks", label: "My tasks", icon: CheckSquare },
  { href: "/feed/earnings", label: "Earnings", icon: DollarSign },
  { href: "/feed/profile", label: "Profile", icon: User },
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

function formatEarned(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function WorkerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: mySubmissions = [] } = useSubmissionsQuery(
    user ? { workerId: user.id } : undefined
  );
  const pendingCount = mySubmissions.filter((s) => s.status === "pending").length;
  const totalEarnedCents =
    user?.totalEarned ??
    mySubmissions
      .filter((s) => s.status === "approved" && s.task)
      .reduce((sum, s) => sum + (s.task!.reward ?? 0), 0);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      clearSession();
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const handleSignOut = () => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
    clearSession();
    logout();
    router.replace("/login");
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      {/* Top bar: desktop = full nav; mobile = logo + avatar only */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <SheetRoot open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" showCloseButton className="flex flex-col p-0">
            <SheetHeader className="border-sidebar-border">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SheetBody className="flex flex-1 flex-col gap-4 p-4">
              {BOTTOM_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  {label}
                </Link>
              ))}
              <div className="mt-auto border-t border-sidebar-border pt-4">
                <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Account
                </p>
                <p className="px-3 text-sm font-medium text-foreground">{user.name}</p>
                <p className="px-3 text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 px-3 text-sm font-semibold text-primary">
                  Total earned: {formatEarned(totalEarnedCents)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-sidebar-border"
                  onClick={handleSignOut}
                >
                  Sign out
                </Button>
              </div>
            </SheetBody>
          </SheetContent>
        </SheetRoot>

        <Link
          href="/feed"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Task<span className="text-primary">Flow</span>
        </Link>

        {/* Desktop: pill nav + theme + avatar dropdown */}
        <nav className="hidden gap-1 md:ml-4 md:flex">
          {FEED_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <UserAvatar name={user.name} className="size-8" />
              <ChevronDown
                className={cn("hidden size-4 text-muted-foreground md:block", profileOpen && "rotate-180")}
              />
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover py-2 shadow-lg"
                role="menu"
              >
                <div className="flex items-center gap-3 px-3 py-2">
                  <UserAvatar name={user.name} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <p className="border-t border-border px-3 py-2 text-sm font-semibold text-primary">
                  Total earned: {formatEarned(totalEarnedCents)}
                </p>
                <div className="border-t border-border" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  <User className="size-4" />
                  Edit profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>

      {/* Mobile: fixed bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden"
        aria-label="Main navigation"
      >
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          const isMyTasks = href === "/feed/my-tasks";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[44px] flex-col items-center gap-0.5 rounded-lg px-3 py-2 transition-colors touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <Icon className="size-6 shrink-0" />
                {isMyTasks && pendingCount > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
