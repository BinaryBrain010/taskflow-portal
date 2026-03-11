"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useQueryStates, parseAsStringLiteral, parseAsString } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight, X, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Submission, SubmissionStatus } from "@/lib/types";
import { useSubmissionsQuery, useReviewSubmission } from "@/hooks/useSubmissions";
import { useTasksQuery } from "@/hooks/useTasks";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SubmissionRow, STATUS_STYLES, formatTime, TaskTypeBadge } from "@/components/admin-submissions/SubmissionRow";
import { SubmissionDetailSidebar } from "@/components/admin-submissions/SubmissionDetailSidebar";
import { SubmissionsEmptyState } from "@/components/admin-submissions/SubmissionsEmptyState";
import { TaskSearchSelect } from "@/components/admin-submissions/TaskSearchSelect";
import { FilterDatePicker } from "@/components/admin-submissions/FilterDatePicker";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const ROW_HEIGHT = 56;
const OVERSCAN = 5;
const workerUsers = mockUsers.filter((u) => u.role === "worker");
const WORKER_OPTIONS = [
  { value: "", label: "All workers" },
  ...workerUsers.map((u) => ({ value: u.id, label: u.name })),
];

const TAB_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-destructive/15 text-destructive",
};

function WorkerAvatar({ name, className }: { name: string; className?: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary",
        className
      )}
    >
      {initial}
    </div>
  );
}

export default function AdminSubmissionsPage() {
  const [params, setParams] = useQueryStates(parsers);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
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

  const statusCounts = useMemo(() => {
    if (params.status !== "all") {
      return {
        pending: params.status === "pending" ? submissions.length : undefined,
        approved: params.status === "approved" ? submissions.length : undefined,
        rejected: params.status === "rejected" ? submissions.length : undefined,
      };
    }
    return {
      pending: submissions.filter((s) => s.status === "pending").length,
      approved: submissions.filter((s) => s.status === "approved").length,
      rejected: submissions.filter((s) => s.status === "rejected").length,
    };
  }, [submissions, params.status]);

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
      taskType: list[0]?.task?.type,
      submissions: list,
    }));
  }, [sorted]);

  const flatItems = sorted;

  const hasActiveFilters =
    params.taskId !== "" ||
    params.workerId !== "" ||
    params.dateFrom !== "" ||
    params.dateTo !== "";

  const clearFilters = () => {
    setParams({ taskId: "", workerId: "", dateFrom: "", dateTo: "" });
  };

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
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleQuickApprove = (s: Submission) => {
    reviewMutation.mutate({ id: s.id, action: "approve" });
  };
  const handleQuickReject = (s: Submission) => {
    reviewMutation.mutate({ id: s.id, action: "reject", note: "Rejected from list." });
  };

  const detailOpen = !!selected;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Submissions
      </h1>

      {/* Row 1: Status tabs (pill style with count badges) */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status">
        {STATUS_TABS.map(({ value, label }) => {
          const count =
            value === "all" ? undefined : statusCounts[value as keyof typeof statusCounts];
          const isSelected = params.status === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setParams({ status: value })}
              className={cn(
                "inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span>{label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    isSelected ? "bg-primary-foreground/20" : TAB_BADGE_STYLES[value] ?? "bg-muted"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Row 2: View toggle | Sort | Clear filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            View
          </span>
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
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sort
          </Label>
          <SelectDropdown.Root
            value={params.sort}
            onValueChange={(v) => setParams({ sort: v as "newest" | "oldest" })}
            options={SORT_OPTIONS}
            placeholder="Sort"
          >
            <SelectDropdown.Trigger />
            <SelectDropdown.Content />
          </SelectDropdown.Root>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-muted-foreground">
            Clear filters
          </Button>
        )}
      </div>

      {/* Row 3: Task | Worker | From | To */}
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Task
          </Label>
          <TaskSearchSelect
            value={params.taskId}
            onChange={(v) => setParams({ taskId: v })}
            tasks={tasks}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Worker
          </Label>
          <SelectDropdown.Root
            value={params.workerId}
            onValueChange={(v) => setParams({ workerId: v })}
            options={WORKER_OPTIONS}
            placeholder="All workers"
          >
            <SelectDropdown.Trigger />
            <SelectDropdown.Content />
          </SelectDropdown.Root>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            From
          </Label>
          <FilterDatePicker
            value={params.dateFrom}
            onChange={(v) => setParams({ dateFrom: v })}
            placeholder="From date"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            To
          </Label>
          <FilterDatePicker
            value={params.dateTo}
            onChange={(v) => setParams({ dateTo: v })}
            placeholder="To date"
          />
        </div>
      </div>

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
          <div className="min-w-0 flex-1">
            {params.view === "grouped" ? (
              <div className="space-y-2 overflow-y-auto pr-2">
                {grouped.length === 0 ? (
                  <SubmissionsEmptyState statusFilter={params.status} className="flex-1" />
                ) : (
                  grouped.map(({ taskId, taskTitle, taskType, submissions: list }) => {
                    const isExpanded = !collapsedTasks.has(taskId);
                    return (
                      <div
                        key={taskId}
                        className="overflow-hidden rounded-xl border border-border bg-card"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTask(taskId)}
                          className="flex w-full items-center gap-3 border-b border-border bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                            {taskTitle}
                          </span>
                          {taskType != null && <TaskTypeBadge type={taskType} />}
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {list.length}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="divide-y divide-border/80">
                            {list.map((s) => (
                              <div key={s.id} className="p-2">
                                <SubmissionRow
                                  submission={s}
                                  onClick={() => setSelected(s)}
                                  isSelected={selected?.id === s.id}
                                  onApprove={handleQuickApprove}
                                  onReject={handleQuickReject}
                                  isReviewPending={reviewMutation.isPending}
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
                  <SubmissionsEmptyState statusFilter={params.status} className="min-h-[320px]" />
                ) : (
                  <>
                    {/* Table header */}
                    <div className="sticky top-0 z-10 grid grid-cols-[1fr_1fr_100px_100px_100px_60px_80px] gap-2 border-b border-border bg-card px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span>Worker</span>
                      <span>Task</span>
                      <span>Type</span>
                      <span>Status</span>
                      <span>Submitted</span>
                      <span>Proofs</span>
                      <span className="text-right">Actions</span>
                    </div>
                    <VirtualizedFlatList
                      submissions={flatItems}
                      selectedId={selected?.id ?? null}
                      onSelect={setSelected}
                      onApprove={handleQuickApprove}
                      onReject={handleQuickReject}
                      isReviewPending={reviewMutation.isPending}
                      scrollRef={scrollRef}
                      rowHeight={ROW_HEIGHT}
                      overscan={OVERSCAN}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {!isMobile && detailOpen && selected && (
            <aside className="hidden w-full max-w-[min(24rem,90vw)] shrink-0 border-l border-border bg-card md:block">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Submission</h2>
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
  onApprove,
  onReject,
  isReviewPending,
  scrollRef,
  rowHeight,
  overscan,
}: {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (s: Submission) => void;
  onApprove: (s: Submission) => void;
  onReject: (s: Submission) => void;
  isReviewPending: boolean;
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
        const workerName = s.worker?.name ?? s.workerId;
        const taskTitle = s.task?.title ?? s.taskId;
        const isPending = s.status === "pending";
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
            className={cn(
              "grid cursor-pointer grid-cols-[1fr_1fr_100px_100px_100px_60px_80px] items-center gap-2 border-b border-border/80 px-4 py-2 transition-colors hover:bg-muted/40",
              selectedId === s.id && "bg-primary/5 ring-inset ring-1 ring-primary/20"
            )}
            onClick={() => onSelect(s)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <WorkerAvatar name={workerName} className="size-8" />
              <span className="truncate text-sm font-medium">{workerName}</span>
            </div>
            <Link
              href={`/admin/tasks/${s.taskId}/edit`}
              className="truncate text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {taskTitle}
            </Link>
            <TaskTypeBadge type={s.task?.type ?? "—"} />
            <span
              className={cn(
                "w-fit rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                STATUS_STYLES[s.status]
              )}
            >
              {s.status}
            </span>
            <span className="text-xs text-muted-foreground">{formatTime(s.submittedAt)}</span>
            <span className="text-xs text-muted-foreground">{s.proofUrls.length}</span>
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {isPending ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-full text-green-600 hover:bg-green-500/15"
                    onClick={() => onApprove(s)}
                    disabled={isReviewPending}
                    aria-label="Approve"
                  >
                    {isReviewPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-full text-destructive hover:bg-destructive/15"
                    onClick={() => onReject(s)}
                    disabled={isReviewPending}
                    aria-label="Reject"
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
