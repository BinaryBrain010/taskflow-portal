"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryStates, parseAsStringLiteral } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Task, TaskType } from "@/lib/types";
import { useTasksQuery } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { useIsMobile } from "@/hooks/useIsMobile";
import { TaskCard, TYPE_LABELS, TYPE_BADGE, countdown, formatRewardCents } from "@/components/feed/TaskCard";
import type { WorkerSubmissionStatus } from "@/components/feed/TaskCard";
import { TaskDetailPanel } from "@/components/feed/TaskDetailPanel";
import {
  FeedFiltersPanel,
  DEFAULT_FEED_ADVANCED_FILTERS,
  isDefaultFilters,
  applyAdvancedFilters,
  type FeedAdvancedFilters,
} from "@/components/feed/FeedFiltersPanel";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { Search, LayoutGrid, List, Filter, Inbox, ClipboardList, Eye, Tag, Mic, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const FEED_VIEW_KEY = "feed_view_mode";
const CARD_ESTIMATE = 140;
const ROW_HEIGHT = 40;
const OVERSCAN = 5;
const VIRTUAL_THRESHOLD = 100;

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

function sortTasks(tasks: Task[], sort: "latest" | "highest_reward"): Task[] {
  const copy = [...tasks];
  if (sort === "latest") {
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    copy.sort((a, b) => b.reward - a.reward);
  }
  return copy;
}

function expiresRelative(expiresAt: string | null): string {
  if (!expiresAt) return "—";
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  if (end <= now) return "Expired";
  const d = Math.floor((end - now) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "1d";
  return `${d}d`;
}

function slotsUrgency(slotsLeft: number, total: number): "normal" | "low" | "critical" {
  if (total <= 0) return "normal";
  const pct = (slotsLeft / total) * 100;
  if (pct < 10) return "critical";
  if (pct < 50) return "low";
  return "normal";
}

function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex justify-between gap-2">
        <div className="h-4 w-14 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-1.5 h-3.5 w-full animate-pulse rounded bg-muted" />
      <div className="mt-1 h-3 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-2 flex gap-2">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-1.5 h-1 w-full animate-pulse rounded-full bg-muted" />
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

const EMPTY_TYPE: Record<TaskType, { icon: React.ComponentType<{ className?: string }>; msg: string }> = {
  survey: { icon: ClipboardList, msg: "No Survey tasks available right now." },
  content_review: { icon: Eye, msg: "No Content Review tasks available right now." },
  data_labeling: { icon: Tag, msg: "No Data Labeling tasks available right now." },
  transcription: { icon: Mic, msg: "No Transcription tasks available right now." },
};

export default function FeedPage() {
  const [params, setParams] = useQueryStates(feedParsers);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [viewMode, setViewModeState] = useState<"card" | "table">("card");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FeedAdvancedFilters>(DEFAULT_FEED_ADVANCED_FILTERS);
  const [filtersApplied, setFiltersApplied] = useState<FeedAdvancedFilters>(DEFAULT_FEED_ADVANCED_FILTERS);
  const isMobile = useIsMobile();
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const raw = localStorage.getItem(FEED_VIEW_KEY);
    if (raw === "card" || raw === "table") setViewModeState(raw);
  }, []);

  const setViewMode = useCallback((mode: "card" | "table") => {
    setViewModeState(mode);
    localStorage.setItem(FEED_VIEW_KEY, mode);
  }, []);

  const { data: mySubmissions = [], isLoading: submissionsLoading } = useSubmissionsQuery(
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

  const { data: tasks = [], isLoading: tasksLoading, error, isPlaceholderData } = useTasksQuery(filters, {
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

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab;
    const q = searchQuery.trim().toLowerCase();
    return filteredByTab.filter((t) => t.title.toLowerCase().includes(q));
  }, [filteredByTab, searchQuery]);

  const filteredByAdvanced = useMemo(
    () => applyAdvancedFilters(filteredBySearch, filtersApplied),
    [filteredBySearch, filtersApplied]
  );

  const counts = useMemo(() => {
    const openCount = sortedTasks.filter((t) => t.totalSlots - t.filledSlots > 0).length;
    const claimedCount = sortedTasks.filter((t) => claimedTaskIds.has(t.id)).length;
    return { all: sortedTasks.length, open: openCount, claimed: claimedCount };
  }, [sortedTasks, claimedTaskIds]);

  const activeFilterCount = useMemo(() => {
    if (isDefaultFilters(filtersApplied)) return 0;
    let n = 0;
    if (filtersApplied.rewardMin !== DEFAULT_FEED_ADVANCED_FILTERS.rewardMin || filtersApplied.rewardMax !== DEFAULT_FEED_ADVANCED_FILTERS.rewardMax) n++;
    if (filtersApplied.slotsLeft !== "any") n++;
    if (filtersApplied.expiry !== "any") n++;
    return n;
  }, [filtersApplied]);

  const list = filteredByAdvanced;
  const useVirtual = list.length > VIRTUAL_THRESHOLD;
  const cardRowCount = viewMode === "card" || isMobile ? Math.ceil(list.length / 2) : list.length;
  const virtualCount = viewMode === "table" && !isMobile ? list.length : cardRowCount;
  const virtualEstimate = viewMode === "table" && !isMobile ? ROW_HEIGHT : CARD_ESTIMATE;

  const virtualizer = useVirtualizer({
    count: useVirtual ? virtualCount : 0,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => virtualEstimate,
    overscan: OVERSCAN,
  });

  const openDetail = (task: Task) => setSelectedTask(task);
  const closeDetail = () => setSelectedTask(null);
  const detailOpen = !!selectedTask;

  const handleClearSearch = () => setSearchQuery("");
  const handleApplyFilters = () => {
    setFiltersApplied(advancedFilters);
    setFiltersOpen(false);
  };
  const handleClearFilters = () => {
    setAdvancedFilters(DEFAULT_FEED_ADVANCED_FILTERS);
    setFiltersApplied(DEFAULT_FEED_ADVANCED_FILTERS);
  };

  const isEmpty = !tasksLoading && !error && list.length === 0;
  const emptyBecauseSearch = searchQuery.trim() !== "" && filteredByTab.length > 0 && list.length === 0;
  const emptyBecauseType = params.type !== "all" && filteredByTab.length === 0 && !searchQuery.trim();
  const emptyAllClaimed = params.tab === "open" && sortedTasks.length > 0 && filteredByTab.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Top bar: single row */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex shrink-0 items-center gap-1" role="tablist" aria-label="Feed status">
            {FEED_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={params.tab === id}
                onClick={() => setParams({ tab: id })}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  params.tab === id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label} {counts[id]}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center rounded-lg border border-border bg-muted/30 p-0.5">
            {SORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setParams({ sort: value })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  params.sort === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className={cn(
              "flex items-center overflow-hidden transition-[width] duration-200",
              searchExpanded ? "w-48" : "w-8"
            )}
          >
            <button
              type="button"
              onClick={() => {
                setSearchExpanded((e) => !e);
                if (!searchExpanded) setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={searchExpanded ? "Collapse search" : "Expand search"}
            >
              <Search className="size-4" />
            </button>
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => { if (!searchQuery.trim()) setSearchExpanded(false); }}
              className="h-8 w-44 border-0 bg-transparent pl-1 text-sm shadow-none focus-visible:ring-0"
              aria-label="Search tasks"
            />
          </div>
          {!isMobile && (
            <div className="ml-auto flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
              <Tooltip content="Card view">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md transition-colors",
                    viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label="Card view"
                >
                  <LayoutGrid className="size-4" />
                </button>
              </Tooltip>
              <Tooltip content="Table view">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md transition-colors",
                    viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label="Table view"
                >
                  <List className="size-4" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Type filter row: horizontal scroll + Filters */}
        <div className="relative flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-1 overflow-x-auto py-1 scrollbar-none"
            role="tablist"
            aria-label="Task type"
          >
            {TYPE_TABS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={params.type === value}
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
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              filtersOpen || activeFilterCount > 0
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-expanded={filtersOpen}
            aria-label="Filters"
          >
            <Filter className="size-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary-foreground/25 text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>
          {/* Gradient mask for scroll hint */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-4 shrink-0 bg-gradient-to-r from-background to-transparent" aria-hidden />
          <div className="pointer-events-none absolute right-14 top-0 h-full w-4 shrink-0 bg-gradient-to-l from-background to-transparent" aria-hidden />
        </div>

        {filtersOpen && (
          <FeedFiltersPanel
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            isOpen={true}
          />
        )}

        {/* Main content */}
        <div className="flex min-h-0 flex-1 gap-0">
          <div className="flex min-w-0 flex-1 flex-col">
            {tasksLoading && !isPlaceholderData && (
              <>
                {viewMode === "card" && (
                  <div className="grid grid-cols-1 gap-0 divide-y divide-border md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <TaskCardSkeleton key={i} />
                    ))}
                  </div>
                )}
                {viewMode === "table" && !isMobile && (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[700px] border-collapse">
                      <thead className="sticky top-0 z-10 border-b border-border bg-muted/50">
                        <tr className="h-10 text-left text-xs font-medium text-muted-foreground">
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Reward</th>
                          <th className="px-3 py-2">Slots left</th>
                          <th className="px-3 py-2">Filled %</th>
                          <th className="px-3 py-2">Expires</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <TableRowSkeleton key={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            {error && (
              <div className="flex flex-1 items-center justify-center py-12">
                <p className="text-sm text-destructive">{error.message ?? "Failed to load tasks."}</p>
              </div>
            )}
            {!tasksLoading && !error && isEmpty && (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                {emptyBecauseSearch && (
                  <>
                    <div className="rounded-full bg-muted p-4">
                      <Search className="size-10 text-muted-foreground" />
                    </div>
                    <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                      No tasks match &quot;{searchQuery.trim()}&quot;
                    </h2>
                    <Button variant="link" className="mt-1 text-primary" onClick={handleClearSearch}>
                      Clear search
                    </Button>
                  </>
                )}
                {emptyAllClaimed && (
                  <>
                    <div className="rounded-full bg-muted p-4">
                      <Check className="size-10 text-muted-foreground" />
                    </div>
                    <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                      You&apos;ve submitted all available tasks!
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">Check back soon.</p>
                  </>
                )}
                {emptyBecauseType && (
                  (() => {
                    const { icon: Icon, msg } = EMPTY_TYPE[params.type as TaskType];
                    return (
                      <>
                        <div className="rounded-full bg-muted p-4">
                          <Icon className="size-10 text-muted-foreground" />
                        </div>
                        <h2 className="mt-4 font-display text-lg font-semibold text-foreground">{msg}</h2>
                      </>
                    );
                  })()
                )}
                {!emptyBecauseSearch && !emptyAllClaimed && !emptyBecauseType && (
                  <>
                    <div className="rounded-full bg-muted p-4">
                      <Inbox className="size-10 text-muted-foreground" />
                    </div>
                    <h2 className="mt-4 font-display text-lg font-semibold text-foreground">No tasks available</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Check back soon.</p>
                  </>
                )}
              </div>
            )}
            {!tasksLoading && !error && list.length > 0 && (
              <>
                {viewMode === "card" || isMobile ? (
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
                          width: "100%",
                          position: "relative",
                        }}
                      >
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                          const i = virtualRow.index;
                          const task1 = list[i * 2];
                          const task2 = list[i * 2 + 1];
                          return (
                            <div
                              key={i}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-y-0 md:divide-x md:divide-border"
                            >
                              {task1 && (
                                <div className="p-2">
                                  <TaskCard
                                    task={task1}
                                    onClick={() => openDetail(task1)}
                                    isSelected={selectedTask?.id === task1.id}
                                    workerStatus={(taskIdToStatus.get(task1.id) ?? null) as WorkerSubmissionStatus}
                                    compact
                                  />
                                </div>
                              )}
                              {task2 && (
                                <div className="p-2">
                                  <TaskCard
                                    task={task2}
                                    onClick={() => openDetail(task2)}
                                    isSelected={selectedTask?.id === task2.id}
                                    workerStatus={(taskIdToStatus.get(task2.id) ?? null) as WorkerSubmissionStatus}
                                    compact
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2">
                        {list.map((task) => {
                          const workerStatus = (taskIdToStatus.get(task.id) ?? null) as WorkerSubmissionStatus;
                          return (
                            <div key={task.id} className="p-2">
                              <TaskCard
                                task={task}
                                onClick={() => openDetail(task)}
                                isSelected={selectedTask?.id === task.id}
                                workerStatus={workerStatus}
                                compact
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div ref={scrollParentRef} className="flex-1 overflow-auto min-h-0">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-border bg-muted/50">
                          <tr className="h-10 text-left text-xs font-medium text-muted-foreground">
                            <th className="px-3 py-2">Title</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Reward</th>
                            <th className="px-3 py-2">Slots left</th>
                            <th className="px-3 py-2">Filled %</th>
                            <th className="px-3 py-2">Expires</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((task, idx) => {
                            const slotsLeft = task.totalSlots - task.filledSlots;
                            const pctFilled = task.totalSlots > 0 ? (task.filledSlots / task.totalSlots) * 100 : 0;
                            const status = taskIdToStatus.get(task.id);
                            const urgency = slotsUrgency(slotsLeft, task.totalSlots);
                            return (
                              <tr
                                key={task.id}
                                className={cn(
                                  "h-10 border-b border-border text-sm transition-colors hover:bg-muted/50",
                                  idx % 2 === 0 && "bg-muted/30"
                                )}
                              >
                                <td className="max-w-[180px] truncate px-3 py-2" title={task.title}>
                                  <Tooltip content={task.title}>
                                    <span className="block truncate font-medium">{task.title}</span>
                                  </Tooltip>
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium",
                                      TYPE_BADGE[task.type]
                                    )}
                                  >
                                    {TYPE_LABELS[task.type]}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-medium text-primary">
                                  {formatRewardCents(task.reward)}
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2 tabular-nums",
                                    urgency === "critical" && "text-amber-600 dark:text-amber-400"
                                  )}
                                >
                                  {slotsLeft}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-16 min-w-16 overflow-hidden rounded-full bg-muted">
                                      <div
                                        className={cn(
                                          "h-full rounded-full",
                                          pctFilled >= 90 ? "bg-destructive" : pctFilled >= 50 ? "bg-amber-500" : "bg-green-500"
                                        )}
                                        style={{ width: `${pctFilled}%` }}
                                      />
                                    </div>
                                    <span className="text-xs tabular-nums">{Math.round(pctFilled)}%</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">
                                  {expiresRelative(task.expiresAt)}
                                </td>
                                <td className="px-3 py-2">
                                  {status ? (
                                    <span
                                      className={cn(
                                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                                        status === "approved" && "bg-green-500/15 text-green-700 dark:text-green-200",
                                        status === "pending" && "bg-amber-500/15 text-amber-700 dark:text-amber-200",
                                        status === "rejected" && "bg-destructive/15 text-destructive"
                                      )}
                                    >
                                      {status === "approved" ? "Approved" : status === "pending" ? "Submitted" : "Rejected"}
                                    </span>
                                  ) : (
                                    <span
                                      className={cn(
                                        "text-xs",
                                        urgency === "critical" && "text-amber-600 dark:text-amber-400",
                                        urgency === "low" && "text-muted-foreground"
                                      )}
                                    >
                                      {urgency === "critical" ? "Critical" : urgency === "low" ? "Low" : "Normal"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-primary"
                                    onClick={() => openDetail(task)}
                                  >
                                    Open →
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
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
      </div>
  );
}
