"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  ListTodo,
  Send,
  Users,
  PanelLeftClose,
  PanelLeft,
  Pin,
  Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mockCampaigns } from "@/lib/mock/mockCampaigns";
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

const PINNED_STORAGE_KEY = "taskflow-pinned-campaign-ids";

function getPinnedCampaignIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return mockCampaigns.slice(0, 3).map((c) => c.id);
    return JSON.parse(raw);
  } catch {
    return mockCampaigns.slice(0, 3).map((c) => c.id);
  }
}

function setPinnedCampaignIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(ids.slice(0, 5)));
}

const ADMIN_NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tasks", label: "Tasks", icon: ListTodo },
  { href: "/admin/submissions", label: "Submissions", icon: Send },
  { href: "/admin/users", label: "Users", icon: Users },
];

function UserAvatar({ name, className }: { name: string; className?: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground",
        className
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function SidebarNav({
  navItems = ADMIN_NAV,
  pathname,
  collapsed,
  onNavigate,
}: {
  navItems: typeof ADMIN_NAV;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <Icon className="size-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function PinnedCampaignsSection({ collapsed }: { collapsed?: boolean }) {
  const [pinPopoverOpen, setPinPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPinnedIds(getPinnedCampaignIds());
  }, [pinPopoverOpen]);

  const updatePosition = useCallback(() => {
    if (anchorRef.current && typeof document !== "undefined") {
      const rect = anchorRef.current.getBoundingClientRect();
      setPopoverPosition({ top: rect.top, left: rect.right + 4 });
    }
  }, []);

  useLayoutEffect(() => {
    if (!pinPopoverOpen) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll);
  }, [pinPopoverOpen, updatePosition]);

  useEffect(() => {
    if (!pinPopoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      const popover = document.querySelector("[data-pin-campaign-popover]");
      if (popover?.contains(target)) return;
      setPinPopoverOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pinPopoverOpen]);

  const pinnedCampaigns = pinnedIds
    .map((id) => mockCampaigns.find((c) => c.id === id))
    .filter(Boolean) as typeof mockCampaigns;
  const availableToPin = mockCampaigns.filter((c) => !pinnedIds.includes(c.id));
  const filteredToPin = search.trim()
    ? availableToPin.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.id.toLowerCase().includes(search.toLowerCase())
      )
    : availableToPin;

  if (collapsed) return null;

  const popoverContent =
    pinPopoverOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            data-pin-campaign-popover
            className="fixed z-[100] w-56 rounded-md border border-border bg-popover p-2 shadow-lg"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 max-h-40 overflow-auto">
              {filteredToPin.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  {pinnedIds.length >= 5 ? "Max 5 pinned" : "No matching campaigns"}
                </p>
              ) : (
                filteredToPin.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setPinnedIds((prev) => {
                        const next = [...prev, c.id].slice(0, 5);
                        setPinnedCampaignIds(next);
                        return next;
                      });
                      setPinPopoverOpen(false);
                      setSearch("");
                    }}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Pin className="size-3.5" />
          Pinned campaigns
        </span>
        <div ref={anchorRef} className="relative inline-block">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={() => setPinPopoverOpen((o) => !o)}
            aria-label="Pin a campaign"
          >
            <Plus className="size-4" />
          </Button>
          {popoverContent}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        {pinnedCampaigns.map((c) => (
          <Link
            key={c.id}
            href={`/admin/tasks?campaignId=${c.id}`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <span className="truncate">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

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
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const sidebarWidth = sidebarCollapsed ? "w-[4rem]" : "w-56";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop: collapsible sidebar */}
      <aside
        className={cn(
          "hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex md:flex-col md:shrink-0",
          sidebarWidth
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
          {!sidebarCollapsed && (
            <Link href="/admin" className="font-display text-lg font-semibold text-sidebar-foreground truncate">
              TaskFlow Admin
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeft className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <SidebarNav pathname={pathname} collapsed={sidebarCollapsed} navItems={ADMIN_NAV} />
          <PinnedCampaignsSection collapsed={sidebarCollapsed} />
          <div className={cn("border-t border-sidebar-border p-2", sidebarCollapsed && "flex flex-col items-center")}>
            <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2", sidebarCollapsed && "justify-center px-2")}>
              <UserAvatar name={user.name} />
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn("mt-2 w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", sidebarCollapsed && "w-auto px-2")}
              onClick={() => {
                clearSession();
                logout();
                router.replace("/login");
              }}
            >
              {sidebarCollapsed ? "Out" : "Sign out"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile: menu button + Sheet */}
      <div className="flex flex-1 flex-col md:min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:border-l">
          <SheetRoot open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <PanelLeft className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" showCloseButton={true} className="flex flex-col p-0">
              <SheetHeader className="border-sidebar-border">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SheetBody className="flex flex-1 flex-col p-0">
                <SidebarNav
                  pathname={pathname}
                  navItems={ADMIN_NAV}
                  onNavigate={() => setMobileSheetOpen(false)}
                />
                <div className="mt-auto border-t border-sidebar-border p-4">
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
                      setMobileSheetOpen(false);
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
          <div className="flex flex-1 items-center justify-end gap-2 md:justify-end">
            <div className="hidden items-center gap-2 md:flex">
              <UserAvatar name={user.name} className="size-8" />
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
