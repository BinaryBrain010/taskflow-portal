"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  ListTodo,
  Send,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  Pin,
  Plus,
  MoreHorizontal,
  User,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { useTasksQuery } from "@/hooks/useTasks";
import { clearSession } from "@/lib/auth";
import {
  getAppSettings,
  setAppSettings,
  getPinnedCampaignIds,
  addPinnedCampaign,
  removePinnedCampaign,
  setPinnedCampaignIds,
} from "@/lib/settings";
import type { Campaign } from "@/lib/mock/mockCampaigns";
import { mockCampaigns } from "@/lib/mock/mockCampaigns";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  SheetRoot,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ADMIN_NAV: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tasks", label: "Tasks", icon: ListTodo },
  { href: "/admin/submissions", label: "Submissions", icon: Send },
  { href: "/admin/users", label: "Users", icon: Users },
];

const PIN_DOT_COLORS = [
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-violet-500",
];

function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
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

function SidebarNav({
  pathname,
  collapsed,
  pendingCount,
  activeTasksCount,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  pendingCount: number;
  activeTasksCount: number;
  onNavigate?: () => void;
}) {
  const getBadge = (href: string) => {
    if (href === "/admin/submissions" && pendingCount > 0)
      return (
        <span className="ml-auto rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
          {pendingCount}
        </span>
      );
    if (href === "/admin/tasks" && activeTasksCount > 0)
      return (
        <span className="ml-auto rounded-full bg-primary/90 px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {activeTasksCount}
        </span>
      );
    return null;
  };

  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/admin" && pathname.startsWith(href));
        const badge = getBadge(href);
        const linkContent = (
          <>
            <Icon className="size-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">{label}</span>
                {badge}
              </>
            )}
          </>
        );
        const linkEl = (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "border-l-2 border-transparent",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            {linkContent}
          </Link>
        );
        if (collapsed)
          return (
            <Tooltip key={href} content={label} side="right">
              {linkEl}
            </Tooltip>
          );
        return linkEl;
      })}
    </nav>
  );
}

function PinnedCampaignItem({
  campaign,
  dotColor,
  taskCount,
}: {
  campaign: Campaign;
  dotColor: string;
  taskCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);
  return (
    <div className="group relative flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
      <Link
        href={`/admin/tasks?campaignId=${campaign.id}`}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <span
          className={cn("size-2 shrink-0 rounded-full", dotColor)}
          aria-hidden
        />
        <span className="truncate text-sm text-foreground">{campaign.name}</span>
      </Link>
      <div className="relative shrink-0" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 opacity-0 group-hover:opacity-100"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Campaign menu"
        >
          <MoreHorizontal className="size-4" />
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-0.5 w-36 rounded-md border border-border bg-popover py-1 shadow-lg">
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted"
              onClick={() => {
                removePinnedCampaign(campaign.id);
                setMenuOpen(false);
              }}
            >
              Unpin
            </button>
          </div>
        )}
      </div>
      <Tooltip content={`${taskCount} tasks`} side="right">
        <span className="absolute inset-0" aria-hidden />
      </Tooltip>
    </div>
  );
}

function PinnedCampaignsSection({
  collapsed,
  tasksByCampaign,
}: {
  collapsed?: boolean;
  tasksByCampaign: Map<string, number>;
}) {
  const [pinPopoverOpen, setPinPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const pinRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (pinRef.current && typeof document !== "undefined") {
      const rect = pinRef.current.getBoundingClientRect();
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

  const settings = getAppSettings();
  const pinnedIds =
    settings.pinnedCampaignIds.length > 0
      ? settings.pinnedCampaignIds
      : mockCampaigns.slice(0, 3).map((c) => c.id);

  const pinnedCampaigns = useMemo(() => {
    return pinnedIds
      .map((id) => mockCampaigns.find((c) => c.id === id))
      .filter(Boolean) as Campaign[];
  }, [pinnedIds]);

  const availableToPin = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? mockCampaigns.filter(
          (c) =>
            c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
        )
      : mockCampaigns;
    return list.filter((c) => !pinnedIds.includes(c.id));
  }, [search, pinnedIds]);

  useEffect(() => {
    if (settings.pinnedCampaignIds.length === 0 && mockCampaigns.length >= 3) {
      setPinnedCampaignIds(mockCampaigns.slice(0, 3).map((c) => c.id));
    }
  }, []);

  useEffect(() => {
    if (!pinPopoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (pinRef.current?.contains(target)) return;
      const popover = document.querySelector("[data-pin-campaign-popover]");
      if (popover?.contains(target)) return;
      setPinPopoverOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pinPopoverOpen]);

  if (collapsed) return null;

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Pin className="size-3.5" />
          Pinned campaigns
        </span>
        <div className="relative" ref={pinRef}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={() => setPinPopoverOpen((o) => !o)}
            aria-label="Pin a campaign"
          >
            <Plus className="size-4" />
          </Button>
          {pinPopoverOpen &&
            typeof document !== "undefined" &&
            createPortal(
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
                  {availableToPin.length === 0 ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      {pinnedIds.length >= 5
                        ? "Max 5 pinned"
                        : "No matching campaigns"}
                    </p>
                  ) : (
                    availableToPin.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          addPinnedCampaign(c.id);
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
            )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        {pinnedCampaigns.map((campaign, i) => (
          <PinnedCampaignItem
            key={campaign.id}
            campaign={campaign}
            dotColor={PIN_DOT_COLORS[i % PIN_DOT_COLORS.length]}
            taskCount={tasksByCampaign.get(campaign.id) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

function PinnedCampaignsSectionWrapper({
  collapsed,
  tasksByCampaign,
}: {
  collapsed?: boolean;
  tasksByCampaign: Map<string, number>;
}) {
  const settings = getAppSettings();
  if (collapsed || !settings.showPinnedCampaigns) return null;
  return (
    <PinnedCampaignsSection collapsed={collapsed} tasksByCampaign={tasksByCampaign} />
  );
}

function QuickStatsStrip({
  pendingReviews,
  activeTasks,
  workersOnline,
  collapsed,
}: {
  pendingReviews: number;
  activeTasks: number;
  workersOnline: number;
  collapsed?: boolean;
}) {
  const settings = getAppSettings();
  if (collapsed || !settings.showQuickStats) return null;
  return (
    <div className="border-t border-sidebar-border px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span title="Pending reviews">
          🟡 {pendingReviews}
        </span>
        <span title="Active tasks">
          🟢 {activeTasks}
        </span>
        <span title="Workers online">
          👥 {workersOnline}
        </span>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() =>
    getAppSettings().sidebarCollapsed
  );
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const userPopoverRef = useRef<HTMLDivElement>(null);

  const [, setSettingsVersion] = useState(0);
  const settings = getAppSettings();
  const collapsed = sidebarCollapsed ?? settings.sidebarCollapsed;

  const setSidebarCollapsed = useCallback((value: boolean) => {
    setSidebarCollapsedState(value);
    setAppSettings({ sidebarCollapsed: value });
  }, []);

  useEffect(() => {
    setSidebarCollapsedState(settings.sidebarCollapsed);
  }, [settings.sidebarCollapsed]);

  useEffect(() => {
    const onSettingsChange = () => setSettingsVersion((v) => v + 1);
    window.addEventListener("app-settings-change", onSettingsChange);
    return () => window.removeEventListener("app-settings-change", onSettingsChange);
  }, []);

  const { data: submissions = [] } = useSubmissionsQuery(
    { status: "pending" },
    { refetchInterval: 30_000 }
  );
  const { data: tasks = [] } = useTasksQuery(undefined, {
    refetchInterval: 30_000,
  });

  const pendingCount = submissions.length;
  const activeTasksCount = useMemo(
    () => tasks.filter((t) => t.status === "active").length,
    [tasks]
  );
  const [workersOnline, setWorkersOnline] = useState(
    () => Math.floor(Math.random() * 8) + 1
  );
  useEffect(() => {
    const id = setInterval(
      () => setWorkersOnline(Math.floor(Math.random() * 8) + 1),
      30_000
    );
    return () => clearInterval(id);
  }, []);

  const tasksByCampaign = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (t.campaignId)
        map.set(t.campaignId, (map.get(t.campaignId) ?? 0) + 1);
    }
    for (const c of mockCampaigns) {
      if (!map.has(c.id)) map.set(c.id, 0);
    }
    return map;
  }, [tasks]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      clearSession();
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!userPopoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        userPopoverRef.current &&
        !userPopoverRef.current.contains(e.target as Node)
      )
        setUserPopoverOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userPopoverOpen]);

  const handleSignOut = useCallback(() => {
    setUserPopoverOpen(false);
    clearSession();
    logout();
    router.replace("/login");
  }, [logout, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const sidebarWidth = collapsed ? "w-14" : "w-56";

  const bottomSection = (
    <>
      <div className="border-t border-sidebar-border" />
      <div className="flex flex-col gap-0.5 p-2">
        {!collapsed && (
          <Link
            href="/admin/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "border-l-2 border-transparent",
              pathname === "/admin/settings"
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="size-5 shrink-0" />
            <span>Settings</span>
          </Link>
        )}
        {collapsed && (
          <Tooltip content="Settings" side="right">
            <Link
              href="/admin/settings"
              className="flex items-center justify-center rounded-lg px-2 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-5 shrink-0" />
            </Link>
          </Tooltip>
        )}
        <div className="relative" ref={userPopoverRef}>
          <button
            type="button"
            onClick={() => setUserPopoverOpen((o) => !o)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted",
              collapsed && "justify-center px-2"
            )}
          >
            <UserAvatar name={user.name} className="size-7" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {user.role}
                </p>
              </div>
            )}
          </button>
          {userPopoverOpen && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-md border border-border bg-popover py-1 shadow-lg">
              <Link
                href="#"
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                onClick={(e) => {
                  e.preventDefault();
                  setUserPopoverOpen(false);
                }}
              >
                <User className="size-4" />
                View profile
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => setUserPopoverOpen(false)}
              >
                <Settings className="size-4" />
                Settings
              </Link>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "hidden h-screen border-r border-sidebar-border bg-sidebar md:flex md:flex-col md:shrink-0 md:sticky md:top-0 md:self-start transition-[width] duration-200",
          sidebarWidth
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-2">
          {!collapsed && (
            <Link
              href="/admin"
              className="flex items-center gap-1 truncate font-display text-lg font-semibold text-sidebar-foreground"
            >
              Task<span className="text-primary">Flow</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="size-5" />
            ) : (
              <ChevronLeft className="size-5" />
            )}
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SidebarNav
            pathname={pathname}
            collapsed={collapsed}
            pendingCount={pendingCount}
            activeTasksCount={activeTasksCount}
          />
          <PinnedCampaignsSectionWrapper
            collapsed={collapsed}
            tasksByCampaign={tasksByCampaign}
          />
          <QuickStatsStrip
            pendingReviews={pendingCount}
            activeTasks={activeTasksCount}
            workersOnline={workersOnline}
            collapsed={collapsed}
          />
        </div>
        <div className="shrink-0">{bottomSection}</div>
      </aside>

      <div className="flex flex-1 flex-col md:min-w-0">
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border bg-background px-4 md:border-l">
          <SheetRoot open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger
              className="inline-flex md:hidden items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label="Open menu"
            >
              <ChevronRight className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={true}
              className="flex flex-col p-0 w-64"
            >
              <SheetHeader className="border-sidebar-border">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SheetBody className="flex flex-1 flex-col overflow-auto p-0">
                <SidebarNav
                  pathname={pathname}
                  pendingCount={pendingCount}
                  activeTasksCount={activeTasksCount}
                  onNavigate={() => setMobileSheetOpen(false)}
                />
                <PinnedCampaignsSection
                  collapsed={false}
                  tasksByCampaign={tasksByCampaign}
                />
                <QuickStatsStrip
                  pendingReviews={pendingCount}
                  activeTasks={activeTasksCount}
                  workersOnline={workersOnline}
                  collapsed={false}
                />
                <div className="mt-auto border-t border-sidebar-border p-4">
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => setMobileSheetOpen(false)}
                  >
                    <Settings className="size-5" />
                    Settings
                  </Link>
                  <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
                    <UserAvatar name={user.name} className="size-9" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {user.role}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-sidebar-border text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setMobileSheetOpen(false);
                      handleSignOut();
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </SheetBody>
            </SheetContent>
          </SheetRoot>
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            <UserAvatar name={user.name} className="size-8" />
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {user.role}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
