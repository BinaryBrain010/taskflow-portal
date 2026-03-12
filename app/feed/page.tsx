"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useQueryStates, parseAsStringLiteral } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Task, TaskType } from "@/lib/types";
import { useTasksQuery } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FeedTaskCardCompact, formatReward, countdownRelative } from "@/components/feed/FeedTaskCardCompact";
import { TaskDetailPanel } from "@/components/feed/TaskDetailPanel";
import { Tooltip } from "@/components/ui/tooltip";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Inbox,
  ClipboardList,
  Eye,
  Tag,
  Mic,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEED_VIEW_KEY = "feed-view-mode";
const DEFAULT_VIEW = "table";

const SORT_OPTIONS = [
  { value: "latest" as const, label: "Latest" },
  { value: "highest_reward" as const, label: "Highest Reward" },
];

const TYPE_TABS: { value: "all" | TaskType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "all", label: "All", icon: Inbox },
  { value: "survey", label: "Survey", icon: ClipboardList },
  { value: "content_review", label: "Content Review", icon: Eye },
  { value: "data_labeling", label: "Data Labeling", icon: Tag },
  { value: "transcription", label: "Transcription", icon: Mic },
];

const FEED_TABS = [
  { id: "all" as const, label: "All" },
  { id: "open" as const, label: "Open" },
  { id: "claimed" as const, label: "Claimed" },
];

const SLOTS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "has_slots", label: "Has slots (>0)" },
  { value: "plenty", label: "Plenty (>50%)" },
  { value: "almost_full", label: "Almost full (<10%)" },
];

const EXPIRY_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Expires today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const feedParsers = {
  sort: parseAsStringLiteral(["latest", "highest_reward"] as const).withDefault("latest"),
  type: parseAsStringLiteral([
    "all",
    "survey",
    "content_review",
    "data_labeling",
    "transcription",
  ] as const).withDefault("all"),
  tab: parseAsStringLiteral(["all", "open", "claimed"] as const).withDefault("all"),
};

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

const TYPE_BADGE: Record<TaskType, string> = {
  survey: "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  content_review: "bg-violet-500/15 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200",
  data_labeling: "bg-orange-500/15 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200",
  transcription: "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200",
};

function sortTasks(tasks: Task[], sort: "latest" | "highest_reward"): Task[] {
  const copy = [...tasks];
  if (sort === "latest") {
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    copy.sort((a, b) => b.reward - a.reward);
  }
  return copy;
}

function applyAdvancedFilters(
  tasks: Task[],
  opts: {
    rewardMinCents: number;
    rewardMaxCents: number;
    slotsFilter: string;
    expiryFilter: string;
  }
): Task[] {
  return tasks.filter((t) => {
    if (t.reward < opts.rewardMinCents || t.reward > opts.rewardMaxCents) return false;
    const slotsLeft = t.totalSlots - t.filledSlots;
    const pctLeft = t.totalSlots > 0 ? (slotsLeft / t.totalSlots) * 100 : 100;
    if (opts.slotsFilter === "has_slots" && slotsLeft <= 0) return false;
    if (opts.slotsFilter === "plenty" && pctLeft <= 50) return false;
    if (opts.slotsFilter === "almost_full" && (pctLeft >= 10 || pctLeft <= 0)) return false;
    if (opts.expiryFilter !== "any" && t.expiresAt) {
      const end = new Date(t.expiresAt).getTime();
      const now = Date.now();
      const day = 86400000;
      const todayEnd = new Date(new Date().setHours(23, 59, 59, 999)).getTime();
      const weekEnd = now + 7 * day;
      const monthEnd = now + 30 * day;
      if (opts.expiryFilter === "today" && end > todayEnd) return false;
      if (opts.expiryFilter === "week" && end > weekEnd) return false;
      if (opts.expiryFilter === "month" && end > monthEnd) return false;
    }
    return true;
  });
}

function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex justify-between gap-2">
        <div className="h-4 w-14 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
      <div className="mt-1 h-3 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-2 flex gap-2">
        <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-2 h-1 w-full animate-pulse rounded-full bg-muted" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="h-10 border-b border-border">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <td key={i} className="px-3 py-2">
          <div className="h-4 w-full max-w-[80px] animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

const EMPTY_TYPE_HEADINGS: Record<TaskType | "all", string> = {
  all: "No tasks available right now",
  survey: "No Survey tasks available right now",
  content_review: "No Content Review tasks available right now",
  data_labeling: "No Data Labeling tasks available right now",
  transcription: "No Transcription tasks available right now",
};

export default function FeedPage() {
  const [params, setParams] = useQueryStates(feedParsers);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">(DEFAULT_VIEW);
  const [rewardMinCents, setRewardMinCents] = useState(0);
  const [rewardMaxCents, setRewardMaxCents] = useState(2000); // $20
  const [slotsFilter, setSlotsFilter] = useState("any");
  const [expiryFilter, setExpiryFilter] = useState("any");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const stored = localStorage.getItem(FEED_VIEW_KEY) as "card" | "table" | null;
    if (stored === "card" || stored === "table") setViewMode(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem(FEED_VIEW_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (searchExpanded) searchInputRef.current?.focus();
  }, [searchExpanded]);

  const { user } = useAuth();
  const { data: mySubmissions = [] } = useSubmissionsQuery(
    user ? { workerId: user.id } : undefined
  );
  const claimedTaskIds = useMemo(
    () => new Set(mySubmissions.map((s) => s.taskId)),
    [mySubmissions]
  );
  const taskIdToStatus = useMemo(() => {
    const m = new Map<string, "pending" | "approved" | "rejected">();
    for (const s of mySubmissions) {
      m.set(s.taskId, s.status);
    }
    return m;
  }, [mySubmissions]);

  const filters = useMemo(
    () => ({
      status: "active" as const,
      type: params.type === "all" ? undefined : params.type,
    }),
    [params.type]
  );

  const { data: tasks = [], isLoading, error } = useTasksQuery(filters, {
    placeholderData: (prev) => prev,
  });

  const sortedTasks = useMemo(() => sortTasks(tasks, params.sort), [tasks, params.sort]);

  const filteredByTab = useMemo(() => {
    if (params.tab === "all") return sortedTasks;
    if (params.tab === "open") {
      return sortedTasks.filter((t) => t.totalSlots - t.filledSlots > 0);
    }
    return sortedTasks.filter((t) => claimedTaskIds.has(t.id));
  }, [sortedTasks, params.tab, claimedTaskIds]);

  const filteredByAdvanced = useMemo(
    () =>
      applyAdvancedFilters(filteredByTab, {
        rewardMinCents,
        rewardMaxCents,
        slotsFilter,
        expiryFilter,
      }),
    [filteredByTab, rewardMinCents, rewardMaxCents, slotsFilter, expiryFilter]
  );

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByAdvanced;
    const q = searchQuery.trim().toLowerCase();
    return filteredByAdvanced.filter((t) => t.title.toLowerCase().includes(q));
  }, [filteredByAdvanced, searchQuery]);

  const counts = useMemo(() => {
    const openCount = sortedTasks.filter((t) => t.totalSlots - t.filledSlots > 0).length;
    const claimedCount = sortedTasks.filter((t) => claimedTaskIds.has(t.id)).length;
    return { all: sortedTasks.length, open: openCount, claimed: claimedCount };
  }, [sortedTasks, claimedTaskIds]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (rewardMinCents > 0 || rewardMaxCents < 2000) n++;
    if (slotsFilter !== "any") n++;
    if (expiryFilter !== "any") n++;
    return n;
  }, [rewardMinCents, rewardMaxCents, slotsFilter, expiryFilter]);

  const displayTasks = filteredBySearch;
  const effectiveView = isMobile ? "card" : viewMode;
  const useVirtual = effectiveView === "card" && displayTasks.length > 100;
  const virtualizer = useVirtualizer({
    count: displayTasks.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  });

  const openDetail = (task: Task) => setSelectedTask(task);
  const closeDetail = () => setSelectedTask(null);
  const detailOpen = !!selectedTask;

  const clearAdvancedFilters = () => {
    setRewardMinCents(0);
    setRewardMaxCents(2000);
    setSlotsFilter("any");
    setExpiryFilter("any");
  };

  const emptyType = params.type === "all" ? "all" : params.type;
  const emptyHeading = EMPTY_TYPE_HEADINGS[emptyType];
  const isAllClaimed =
    params.tab === "claimed" && counts.claimed === 0 && counts.all > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Top bar: single compact row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex shrink-0 items-center gap-1">
          {FEED_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setParams({ tab: id })}
              className={cn(
                "rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
                params.tab === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label} {counts[id]}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
            {SORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setParams({ sort: value })}
                className={cn(
                  "rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                  params.sort === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "overflow-hidden transition-[width] duration-200",
                searchExpanded ? "w-48" : "w-0"
              )}
            >
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (!searchQuery.trim()) setSearchExpanded(false);
                }}
                className="h-8 w-48 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setSearchExpanded((e) => !e)}
              aria-label="Search"
            >
              <Search className="size-4" />
            </Button>
          </div>
          {!isMobile && (
            <div className="flex shrink-0 rounded-md border border-border p-0.5">
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("card")}
                aria-label="Card view"
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <List className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Type filter row: horizontal scroll + Filters button */}
      <div className="relative flex items-center gap-2">
        <div
          className="flex gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
          }}
        >
          {TYPE_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setParams({ type: value })}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                params.type === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="relative shrink-0 gap-1.5 border-border px-2.5 py-1 text-xs"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Filter className="size-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Advanced filters panel */}
      {filtersOpen && (
        <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Reward range ($)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={rewardMaxCents / 100}
                  step={0.01}
                  value={rewardMinCents / 100}
                  onChange={(e) =>
                    setRewardMinCents(Math.round(parseFloat(e.target.value || "0") * 100))
                  }
                  className="h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="number"
                  min={rewardMinCents / 100}
                  max={100}
                  step={0.01}
                  value={rewardMaxCents / 100}
                  onChange={(e) =>
                    setRewardMaxCents(Math.round(parseFloat(e.target.value || "20") * 100))
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Slots left
              </label>
              <SelectDropdown.Root
                value={slotsFilter}
                onValueChange={setSlotsFilter}
                options={SLOTS_OPTIONS}
                placeholder="Any"
              >
                <SelectDropdown.Trigger className="h-8 w-full rounded border border-input px-2 text-xs" />
                <SelectDropdown.Content />
              </SelectDropdown.Root>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Expiry
              </label>
              <SelectDropdown.Root
                value={expiryFilter}
                onValueChange={setExpiryFilter}
                options={EXPIRY_OPTIONS}
                placeholder="Any"
              >
                <SelectDropdown.Trigger className="h-8 w-full rounded border border-input px-2 text-xs" />
                <SelectDropdown.Content />
              </SelectDropdown.Root>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={clearAdvancedFilters}>
              Clear filters
            </Button>
            <Button size="sm" className="text-xs" onClick={() => setFiltersOpen(false)}>
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex min-h-0 flex-1 gap-0">
        <div className="flex min-w-0 flex-1 flex-col">
          {error && (
            <div className="flex flex-1 items-center justify-center py-12">
              <p className="text-sm text-destructive">{error.message ?? "Failed to load tasks."}</p>
            </div>
          )}

          {!error && isLoading && !tasks.length && (
            effectiveView === "card" ? (
              <div className="grid gap-0 divide-y divide-border rounded-lg border border-border bg-card md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3">
                    <TaskCardSkeleton />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 border-b border-border bg-muted">
                    <tr className="h-10 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Reward</th>
                      <th className="px-3 py-2">Slots left</th>
                      <th className="px-3 py-2">Filled %</th>
                      <th className="px-3 py-2">Expires</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {!error && !isLoading && displayTasks.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              {searchQuery.trim() ? (
                <>
                  <Search className="size-10 text-muted-foreground" />
                  <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                    No tasks match &quot;{searchQuery}&quot;
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    Clear search
                  </button>
                </>
              ) : isAllClaimed ? (
                <>
                  <Check className="size-10 text-green-500" />
                  <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                    You&apos;ve submitted all available tasks!
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Check back soon.</p>
                </>
              ) : (
                <>
                  {emptyType === "all" ? (
                    <Inbox className="size-10 text-muted-foreground" />
                  ) : (
                    (() => {
                      const TabIcon = TYPE_TABS.find((t) => t.value === emptyType)?.icon ?? Inbox;
                      return <TabIcon className="size-10 text-muted-foreground" />;
                    })()
                  )}
                  <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                    {emptyHeading}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Check back soon.</p>
                </>
              )}
            </div>
          )}

          {!error && displayTasks.length > 0 && effectiveView === "card" && (
            <div
              ref={scrollParentRef}
              className={cn(
                "flex-1 overflow-auto overflow-x-hidden",
                useVirtual && "min-h-0"
              )}
            >
              {useVirtual ? (
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: "relative",
                    width: "100%",
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const task = displayTasks[virtualRow.index];
                    if (!task) return null;
                    const workerStatus = taskIdToStatus.get(task.id) ?? null;
                    return (
                      <div
                        key={task.id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="py-1"
                      >
                        <FeedTaskCardCompact
                          task={task}
                          onClick={() => openDetail(task)}
                          isSelected={selectedTask?.id === task.id}
                          workerStatus={workerStatus}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-0 divide-y divide-border rounded-lg border border-border bg-card md:grid-cols-2 md:divide-x md:divide-y-0">
                  {displayTasks.map((task) => {
                    const workerStatus = taskIdToStatus.get(task.id) ?? null;
                    return (
                      <div key={task.id} className="p-2">
                        <FeedTaskCardCompact
                          task={task}
                          onClick={() => openDetail(task)}
                          isSelected={selectedTask?.id === task.id}
                          workerStatus={workerStatus}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!error && displayTasks.length > 0 && effectiveView === "table" && (
            <div ref={scrollParentRef} className="flex-1 overflow-auto">
              <div className="min-w-[800px]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 border-b border-border bg-muted">
                    <tr className="h-10 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Reward</th>
                      <th className="px-3 py-2">Slots left</th>
                      <th className="px-3 py-2">Filled %</th>
                      <th className="px-3 py-2">Expires</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTasks.map((task, idx) => {
                          const slotsLeft = task.totalSlots - task.filledSlots;
                          const pctFilled =
                            task.totalSlots > 0
                              ? Math.round((task.filledSlots / task.totalSlots) * 100)
                              : 0;
                          const pctLeft = 100 - pctFilled;
                          const workerStatus = taskIdToStatus.get(task.id) ?? null;
                          const urgency =
                            pctLeft > 50 ? "normal" : pctLeft > 10 ? "low" : "critical";
                          return (
                            <tr
                              key={task.id}
                              className={cn(
                                "h-10 border-b border-border",
                                idx % 2 === 1 && "bg-muted/30",
                                "hover:bg-muted/50"
                              )}
                            >
                              <td className="max-w-[200px] truncate px-3 py-2 text-sm">
                                <Tooltip content={task.title} side="top">
                                  <span>{task.title}</span>
                                </Tooltip>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                    TYPE_BADGE[task.type]
                                  )}
                                >
                                  {TYPE_LABELS[task.type]}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-primary">
                                {formatReward(task.reward)}
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2 text-sm",
                                  slotsLeft < (task.totalSlots * 0.1) && "text-amber-600 dark:text-amber-400"
                                )}
                              >
                                {slotsLeft}
                              </td>
                              <td className="flex items-center gap-1.5 px-3 py-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${pctFilled}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{pctFilled}%</span>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {countdownRelative(task.expiresAt)}
                              </td>
                              <td className="px-3 py-2">
                                {workerStatus ? (
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                      workerStatus === "approved" &&
                                        "bg-green-500/15 text-green-700 dark:text-green-200",
                                      workerStatus === "pending" &&
                                        "bg-amber-500/15 text-amber-700 dark:text-amber-200",
                                      workerStatus === "rejected" && "bg-destructive/15 text-destructive"
                                    )}
                                  >
                                    {workerStatus}
                                  </span>
                                ) : (
                                  <span
                                    className={cn(
                                      "text-[10px]",
                                      urgency === "critical" && "text-destructive font-medium",
                                      urgency === "low" && "text-amber-600 dark:text-amber-400"
                                    )}
                                  >
                                    {urgency}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => openDetail(task)}
                                  className="text-xs font-medium text-primary hover:underline"
                                >
                                  Open →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!isMobile && detailOpen && selectedTask && (
          <aside className="hidden w-full max-w-[min(24rem,90vw)] shrink-0 border-l border-border bg-card md:block">
            <div className="sticky top-0 flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="font-display text-lg font-semibold text-foreground">Task details</h2>
                <Button variant="ghost" size="icon" onClick={closeDetail} aria-label="Close">
                  ×
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TaskDetailPanel task={selectedTask} onClose={closeDetail} />
              </div>
            </div>
          </aside>
        )}
      </div>

      {isMobile && (
        <SheetRoot open={detailOpen} onOpenChange={(open) => !open && closeDetail()}>
          <SheetContent side="bottom" showCloseButton className="max-h-[85vh] flex flex-col p-0">
            <SheetHeader className="shrink-0 border-b border-border p-4">
              <SheetTitle>Task details</SheetTitle>
            </SheetHeader>
            <SheetBody className="min-h-0 flex-1 overflow-auto">
              {selectedTask && <TaskDetailPanel task={selectedTask} onClose={closeDetail} />}
            </SheetBody>
          </SheetContent>
        </SheetRoot>
      )}
    </div>
  );
}
