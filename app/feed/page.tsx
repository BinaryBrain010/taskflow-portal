"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryStates, parseAsStringLiteral } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Task, TaskType } from "@/lib/types";
import { useTasksQuery } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { useIsMobile } from "@/hooks/useIsMobile";
import { TaskCard } from "@/components/feed/TaskCard";
import { TaskDetailPanel } from "@/components/feed/TaskDetailPanel";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ClipboardList, Eye, Tag, Mic, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

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

const CARD_HEIGHT_ESTIMATE = 180;
const OVERSCAN = 5;

function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex justify-between gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-14 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-3 flex gap-3">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-muted" />
    </div>
  );
}

const EMPTY_MESSAGES: Record<TaskType | "all", { heading: string; subtext: string }> = {
  all: { heading: "No tasks available", subtext: "Check back soon for new tasks." },
  survey: { heading: "No survey tasks available right now.", subtext: "Check back soon." },
  content_review: { heading: "No content review tasks right now.", subtext: "Check back soon." },
  data_labeling: { heading: "No data labeling tasks right now.", subtext: "Check back soon." },
  transcription: { heading: "No transcription tasks right now.", subtext: "Check back soon." },
};

export default function FeedPage() {
  const [params, setParams] = useQueryStates(feedParsers);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const scrollParentRef = useRef<HTMLDivElement>(null);
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

  const { data: tasks = [], isLoading, error } = useTasksQuery(filters);

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

  const counts = useMemo(() => {
    const openCount = sortedTasks.filter((t) => t.totalSlots - t.filledSlots > 0).length;
    const claimedCount = sortedTasks.filter((t) => claimedTaskIds.has(t.id)).length;
    return { all: sortedTasks.length, open: openCount, claimed: claimedCount };
  }, [sortedTasks, claimedTaskIds]);

  const virtualizer = useVirtualizer({
    count: filteredBySearch.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => CARD_HEIGHT_ESTIMATE,
    overscan: OVERSCAN,
  });

  const openDetail = (task: Task) => setSelectedTask(task);
  const closeDetail = () => setSelectedTask(null);
  const detailOpen = !!selectedTask;

  const emptyType = params.type === "all" ? "all" : params.type;
  const emptyMsg = EMPTY_MESSAGES[emptyType];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-5">
      {/* Sub-tabs: All / Open / Claimed with counts */}
      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Feed filter">
        {FEED_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={params.tab === id}
            onClick={() => setParams({ tab: id })}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
              params.tab === id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-xs font-semibold",
                params.tab === id ? "bg-primary-foreground/25" : "bg-muted"
              )}
            >
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      {/* Sort (segmented) + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setParams({ sort: value })}
              className={cn(
                "min-h-[44px] touch-manipulation rounded-md px-4 py-2 text-sm font-medium transition-colors",
                params.sort === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={cn("w-full sm:w-48 md:w-56")}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Type tabs with icons */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
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
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors touch-manipulation",
              params.type === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Main content: list + desktop sidebar */}
      <div className="flex min-h-0 flex-1 gap-0">
        <div className="flex min-w-0 flex-1 flex-col">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        )}
        {error && (
          <div className="flex flex-1 items-center justify-center py-12">
            <p className="text-sm text-destructive">{error.message ?? "Failed to load tasks."}</p>
          </div>
        )}
        {!isLoading && !error && filteredBySearch.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <Inbox className="size-10 text-muted-foreground" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
              {emptyMsg.heading}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{emptyMsg.subtext}</p>
          </div>
        )}
        {!isLoading && !error && filteredBySearch.length > 0 && (
          <div
            ref={scrollParentRef}
            className="flex-1 overflow-auto overflow-x-hidden transition-opacity duration-200"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const task = filteredBySearch[virtualRow.index];
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
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="py-2"
                  >
                    <TaskCard
                      task={task}
                      onClick={() => openDetail(task)}
                      isSelected={selectedTask?.id === task.id}
                      workerStatus={workerStatus}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {/* Desktop: right sidebar */}
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

      {/* Mobile: bottom sheet */}
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
