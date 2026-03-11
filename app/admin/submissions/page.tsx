"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useQueryStates, parseAsStringLiteral, parseAsString } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import type { Submission, SubmissionStatus } from "@/lib/types";
import { useSubmissionsQuery, useReviewSubmission } from "@/hooks/useSubmissions";
import { useTasksQuery } from "@/hooks/useTasks";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SubmissionRow } from "@/components/admin-submissions/SubmissionRow";
import { SubmissionDetailSidebar } from "@/components/admin-submissions/SubmissionDetailSidebar";
import { TaskSearchSelect } from "@/components/admin-submissions/TaskSearchSelect";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { mockUsers } from "@/lib/mock/mockUsers";
import { useQueryClient } from "@tanstack/react-query";
import { submissionKeys } from "@/hooks/useSubmissions";
import type { SubmissionFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TABS: { value: "all" | SubmissionStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const VIEW_MODES = [
  { value: "grouped" as const, label: "By task" },
  { value: "flat" as const, label: "Flat" },
];

const SORT_OPTIONS = [
  { value: "newest" as const, label: "Newest first" },
  { value: "oldest" as const, label: "Oldest first" },
];

const parsers = {
  status: parseAsStringLiteral(["all", "pending", "approved", "rejected"] as const).withDefault("all"),
  view: parseAsStringLiteral(["grouped", "flat"] as const).withDefault("grouped"),
  taskId: parseAsString.withDefault(""),
  workerId: parseAsString.withDefault(""),
  dateFrom: parseAsString.withDefault(""),
  dateTo: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(["newest", "oldest"] as const).withDefault("newest"),
};

const ROW_HEIGHT = 80;
const OVERSCAN = 5;
const workerUsers = mockUsers.filter((u) => u.role === "worker");

export default function AdminSubmissionsPage() {
  const [params, setParams] = useQueryStates(parsers);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const filters = useMemo<SubmissionFilters>(
    () => ({
      status: params.status === "all" ? undefined : params.status,
      taskId: params.taskId || undefined,
      workerId: params.workerId || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
      groupByTask: params.view === "grouped",
    }),
    [params.status, params.taskId, params.workerId, params.dateFrom, params.dateTo, params.view]
  );

  const { data: submissions = [], isLoading, error } = useSubmissionsQuery(filters);
  const { data: tasks = [] } = useTasksQuery();

  const sorted = useMemo(() => {
    const copy = [...submissions];
    const key = (s: Submission) => (s.submittedAt ? new Date(s.submittedAt).getTime() : 0);
    copy.sort((a, b) =>
      params.sort === "newest" ? key(b) - key(a) : key(a) - key(b)
    );
    return copy;
  }, [submissions, params.sort]);

  const grouped = useMemo(() => {
    const map = new Map<string, Submission[]>();
    for (const s of sorted) {
      const list = map.get(s.taskId) ?? [];
      list.push(s);
      map.set(s.taskId, list);
    }
    return Array.from(map.entries()).map(([taskId, list]) => ({
      taskId,
      taskTitle: list[0]?.task?.title ?? taskId,
      submissions: list,
    }));
  }, [sorted]);

  const flatItems = sorted;

  const handleReviewed = useCallback(
    (submission: Submission) => {
      setSelected((prev) => (prev?.id === submission.id ? submission : prev));
      setToast({
        message: `Submission ${submission.status === "approved" ? "approved" : "rejected"}.`,
        type: "success",
      });
    },
    []
  );

  const reviewMutation = useReviewSubmission({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: submissionKeys.list(filters) });
      const prev = queryClient.getQueryData<Submission[]>(submissionKeys.list(filters));
      queryClient.setQueryData<Submission[]>(submissionKeys.list(filters), (old) =>
        old?.map((s) =>
          s.id === variables.id
            ? { ...s, status: variables.action === "approve" ? "approved" : "rejected" }
            : s
        )
      );
      return { prev };
    },
    onSuccess: handleReviewed,
    onError: (_err, _variables, rollback) => {
      if (typeof rollback === "object" && rollback != null && "prev" in rollback) {
        queryClient.setQueryData(submissionKeys.list(filters), (rollback as { prev: Submission[] }).prev);
      }
      setToast({ message: "Review failed.", type: "error" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const detailOpen = !!selected;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Submissions
        </h1>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Status">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={params.status === value}
            onClick={() => setParams({ status: value })}
            className={cn(
              "min-h-[44px] shrink-0 touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              params.status === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* View toggle + sort + filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">View:</span>
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            {VIEW_MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setParams({ view: value })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  params.view === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <select
            value={params.sort}
            onChange={(e) => setParams({ sort: e.target.value as "newest" | "oldest" })}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Task</Label>
            <TaskSearchSelect
              value={params.taskId}
              onChange={(v) => setParams({ taskId: v })}
              tasks={tasks}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Worker</Label>
            <select
              value={params.workerId}
              onChange={(e) => setParams({ workerId: e.target.value })}
              className="mt-1 h-9 min-w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">All workers</option>
              {workerUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={params.dateFrom}
              onChange={(e) => setParams({ dateFrom: e.target.value })}
              className="mt-1 h-9 w-[140px]"
            />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={params.dateTo}
              onChange={(e) => setParams({ dateTo: e.target.value })}
              className="mt-1 h-9 w-[140px]"
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={cn(
            "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg",
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {toast.message}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading submissions…</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message ?? "Failed to load submissions."}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="flex min-h-0 flex-1 gap-0">
          {/* List: grouped or flat */}
          <div className="min-w-0 flex-1">
            {params.view === "grouped" ? (
              <div className="space-y-2 overflow-y-auto pr-2">
                {grouped.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No submissions match the filters.
                  </p>
                ) : (
                  grouped.map(({ taskId, taskTitle, submissions: list }) => {
                    const isExpanded = expandedTasks.has(taskId);
                    return (
                      <div
                        key={taskId}
                        className="rounded-lg border border-border bg-card overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTask(taskId)}
                          className="flex w-full items-center gap-2 border-b border-border bg-muted/30 px-4 py-3 text-left font-medium text-foreground hover:bg-muted/50"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4 shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0" />
                          )}
                          <span className="truncate">{taskTitle}</span>
                          <span className="text-xs text-muted-foreground">({list.length})</span>
                        </button>
                        {isExpanded && (
                          <div className="divide-y divide-border">
                            {list.map((s) => (
                              <div key={s.id} className="p-2">
                                <SubmissionRow
                                  submission={s}
                                  onClick={() => setSelected(s)}
                                  isSelected={selected?.id === s.id}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div ref={scrollRef} className="h-full overflow-auto">
                {flatItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">
                      No submissions match the filters.
                    </p>
                  </div>
                ) : (
                  <VirtualizedFlatList
                    submissions={flatItems}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelected}
                    scrollRef={scrollRef}
                    rowHeight={ROW_HEIGHT}
                    overscan={OVERSCAN}
                  />
                )}
              </div>
            )}
          </div>

          {/* Desktop: detail sidebar */}
          {!isMobile && detailOpen && selected && (
            <aside className="hidden w-full max-w-[min(24rem,90vw)] shrink-0 border-l border-border bg-card md:block">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Submission
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <SubmissionDetailSidebar
                    submission={selected}
                    onClose={() => setSelected(null)}
                    onReviewed={handleReviewed}
                    reviewMutation={{
                      mutate: reviewMutation.mutate,
                      isPending: reviewMutation.isPending,
                      isError: reviewMutation.isError,
                      error: reviewMutation.error,
                    }}
                  />
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <SheetRoot open={detailOpen} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent side="bottom" showCloseButton className="max-h-[85vh] flex flex-col p-0">
            <SheetHeader className="shrink-0 border-b border-border p-4">
              <SheetTitle>Submission</SheetTitle>
            </SheetHeader>
            <SheetBody className="min-h-0 flex-1 overflow-auto">
              {selected && (
                <SubmissionDetailSidebar
                  submission={selected}
                  onClose={() => setSelected(null)}
                  onReviewed={handleReviewed}
                  reviewMutation={{
                    mutate: reviewMutation.mutate,
                    isPending: reviewMutation.isPending,
                    isError: reviewMutation.isError,
                    error: reviewMutation.error,
                  }}
                />
              )}
            </SheetBody>
          </SheetContent>
        </SheetRoot>
      )}
    </div>
  );
}

function VirtualizedFlatList({
  submissions,
  selectedId,
  onSelect,
  scrollRef,
  rowHeight,
  overscan,
}: {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (s: Submission) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  rowHeight: number;
  overscan: number;
}) {
  const virtualizer = useVirtualizer({
    count: submissions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  return (
    <div
      style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const s = submissions[virtualRow.index];
        if (!s) return null;
        return (
          <div
            key={s.id}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className="px-2 py-1.5"
          >
            <SubmissionRow
              submission={s}
              onClick={() => onSelect(s)}
              isSelected={selectedId === s.id}
            />
          </div>
        );
      })}
    </div>
  );
}
