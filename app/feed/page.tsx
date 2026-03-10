"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryStates, parseAsStringLiteral } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Task, TaskType } from "@/lib/types";
import { useTasksQuery } from "@/hooks/useTasks";
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
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "latest" as const, label: "Latest" },
  { value: "highest_reward" as const, label: "Highest Reward" },
];

const TYPE_TABS: { value: "all" | TaskType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "survey", label: "Survey" },
  { value: "content_review", label: "Content Review" },
  { value: "data_labeling", label: "Data Labeling" },
  { value: "transcription", label: "Transcription" },
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

const CARD_HEIGHT_ESTIMATE = 140;
const OVERSCAN = 5;

export default function FeedPage() {
  const [params, setParams] = useQueryStates(feedParsers);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const isMobile = useIsMobile();
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(
    () => ({
      status: "active" as const,
      type: params.type === "all" ? undefined : params.type,
    }),
    [params.type]
  );

  const { data: tasks = [], isLoading, error } = useTasksQuery(filters);

  const sortedTasks = useMemo(
    () => sortTasks(tasks, params.sort),
    [tasks, params.sort]
  );

  const virtualizer = useVirtualizer({
    count: sortedTasks.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => CARD_HEIGHT_ESTIMATE,
    overscan: OVERSCAN,
  });

  const openDetail = (task: Task) => setSelectedTask(task);
  const closeDetail = () => setSelectedTask(null);
  const detailOpen = !!selectedTask;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Task feed
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            {SORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setParams({ sort: value })}
                className={cn(
                  "min-h-[44px] touch-manipulation rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  params.sort === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Type tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Task type"
      >
        {TYPE_TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={params.type === value}
            onClick={() => setParams({ type: value })}
            className={cn(
              "min-h-[44px] shrink-0 touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              params.type === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main content: list + sidebar/sheet */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Virtual list */}
        <div className="flex-1 min-w-0 flex flex-col">
          {isLoading && (
            <div className="flex flex-1 items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Loading tasks…</p>
            </div>
          )}
          {error && (
            <div className="flex flex-1 items-center justify-center py-12">
              <p className="text-sm text-destructive">
                {error.message ?? "Failed to load tasks."}
              </p>
            </div>
          )}
          {!isLoading && !error && sortedTasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No tasks in this category.</p>
            </div>
          )}
          {!isLoading && !error && sortedTasks.length > 0 && (
            <div ref={scrollParentRef} className="flex-1 overflow-auto">
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const task = sortedTasks[virtualRow.index];
                  if (!task) return null;
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
                      className="px-0 py-2 md:py-2"
                    >
                      <TaskCard
                        task={task}
                        onClick={() => openDetail(task)}
                        isSelected={selectedTask?.id === task.id}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Desktop: right sidebar (not sheet) */}
        {!isMobile && detailOpen && selectedTask && (
          <aside className="hidden w-full max-w-[min(24rem,90vw)] shrink-0 border-l border-border bg-card md:block">
            <div className="sticky top-0 flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="font-display text-lg font-semibold text-foreground">Task details</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDetail}
                  aria-label="Close"
                >
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
  );
}
