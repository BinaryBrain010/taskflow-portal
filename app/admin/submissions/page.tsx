"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useQueryStates, parseAsStringLiteral, parseAsString } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, ChevronRight, X, Check, Loader2, Search } from "lucide-react";
import Link from "next/link";
import type { Submission, SubmissionStatus } from "@/lib/types";
import { useSubmissionsQuery, useReviewSubmission } from "@/hooks/useSubmissions";
import { useTasksQuery } from "@/hooks/useTasks";
import { useUsersQuery } from "@/hooks/useUsers";
import { useIsMobile } from "@/hooks/useIsMobile";
import { STATUS_STYLES, formatTime, TaskTypeBadge } from "@/components/admin-submissions/SubmissionRow";
import { SubmissionDetailSidebar } from "@/components/admin-submissions/SubmissionDetailSidebar";
import { SubmissionsEmptyState } from "@/components/admin-submissions/SubmissionsEmptyState";
import { TaskSearchSelect } from "@/components/admin-submissions/TaskSearchSelect";
import { WorkerSearchSelect } from "@/components/admin-submissions/WorkerSearchSelect";
import { FilterDateRangePicker } from "@/components/admin-submissions/FilterDateRangePicker";
import { SubmissionsSkeleton } from "@/components/admin-submissions/SubmissionsSkeleton";
import { Input } from "@/components/ui/input";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  ConfirmDialogRoot,
  ConfirmDialogContent,
  RejectDialogContent,
} from "@/components/ui/confirm-dialog";
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
  view: parseAsStringLiteral(["grouped", "flat"] as const).withDefault("flat"),
  taskId: parseAsString.withDefault(""),
  workerId: parseAsString.withDefault(""),
  dateFrom: parseAsString.withDefault(""),
  dateTo: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(["newest", "oldest"] as const).withDefault("newest"),
};

const ROW_HEIGHT = 40;
const OVERSCAN = 5;

const TAB_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  approved: "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  rejected: "bg-destructive/15 text-destructive",
};

const TYPE_BORDER_COLORS: Record<string, string> = {
  survey: "border-l-indigo-500",
  content_review: "border-l-violet-500",
  data_labeling: "border-l-orange-500",
  transcription: "border-l-cyan-500",
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

function matchesSearch(s: Submission, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.trim().toLowerCase();
  const worker = (s.worker?.name ?? s.workerId ?? "").toLowerCase();
  const taskTitle = (s.task?.title ?? s.taskId ?? "").toLowerCase();
  return worker.includes(lower) || taskTitle.includes(lower) || s.id.toLowerCase().includes(lower);
}

export default function AdminSubmissionsPage() {
  const [params, setParams] = useQueryStates(parsers);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  // Track expanded task ids (empty = all collapsed by default)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Submission | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Submission | null>(null);
  const [rejectNote, setRejectNote] = useState("");
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

  /** Same filters but no status filter — used only for tab counts so all statuses show correct numbers */
  const filtersForCounts = useMemo<SubmissionFilters>(
    () => ({
      ...filters,
      status: undefined,
    }),
    [filters]
  );

  const { data: submissions = [], isLoading, isFetching, error } = useSubmissionsQuery(filters);
  const { data: submissionsForCounts = [] } = useSubmissionsQuery(filtersForCounts);
  const { data: tasks = [] } = useTasksQuery();
  const { data: workers = [], isFetching: workersFetching } = useUsersQuery({ role: "worker" });

  const statusCounts = useMemo(
    () => ({
      pending: submissionsForCounts.filter((s) => s.status === "pending").length,
      approved: submissionsForCounts.filter((s) => s.status === "approved").length,
      rejected: submissionsForCounts.filter((s) => s.status === "rejected").length,
    }),
    [submissionsForCounts]
  );

  const sorted = useMemo(() => {
    const copy = [...submissions];
    const key = (s: Submission) => (s.submittedAt ? new Date(s.submittedAt).getTime() : 0);
    copy.sort((a, b) =>
      params.sort === "newest" ? key(b) - key(a) : key(a) - key(b)
    );
    return copy;
  }, [submissions, params.sort]);

  const filteredSorted = useMemo(
    () => (searchQuery.trim() ? sorted.filter((s) => matchesSearch(s, searchQuery)) : sorted),
    [sorted, searchQuery]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Submission[]>();
    for (const s of filteredSorted) {
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
  }, [filteredSorted]);

  // Stable key so effect only runs when the set of task ids actually changes (avoids infinite loop from array reference churn)
  const groupedTaskIdsKey = useMemo(
    () => grouped.map((g) => g.taskId).sort().join(","),
    [grouped]
  );
  useEffect(() => {
    setExpandedTasks(new Set());
  }, [groupedTaskIdsKey]);

  const flatItems = filteredSorted;

  const hasActiveFilters =
    params.taskId !== "" ||
    params.workerId !== "" ||
    params.dateFrom !== "" ||
    params.dateTo !== "" ||
    searchQuery.trim() !== "";

  const clearFilters = () => {
    setParams({ taskId: "", workerId: "", dateFrom: "", dateTo: "" });
    setSearchQuery("");
  };

  const expandAll = () => setExpandedTasks(new Set(grouped.map((g) => g.taskId)));
  const collapseAll = () => setExpandedTasks(new Set());

  const handleReviewed = useCallback(
    (submission: Submission) => {
      setSelected((prev) => (prev?.id === submission.id ? submission : prev));
      setToast({
        message:
          submission.status === "approved" ? "Submission approved" : "Submission rejected",
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

  const handleQuickApprove = (s: Submission) => {
    setApproveTarget(s);
    setApproveDialogOpen(true);
  };
  const handleQuickReject = (s: Submission) => {
    setRejectTarget(s);
    setRejectNote("");
    setRejectDialogOpen(true);
  };

  const handleApproveConfirm = useCallback(() => {
    if (!approveTarget) return;
    reviewMutation.mutate(
      { id: approveTarget.id, action: "approve" },
      {
        onSuccess: () => {
          setApproveDialogOpen(false);
          setApproveTarget(null);
        },
      }
    );
  }, [approveTarget, reviewMutation]);

  const handleRejectConfirm = useCallback(
    (note: string) => {
      if (!rejectTarget) return;
      reviewMutation.mutate(
        { id: rejectTarget.id, action: "reject", note: note.trim() || undefined },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setRejectTarget(null);
            setRejectNote("");
          },
        }
      );
    },
    [rejectTarget, reviewMutation]
  );

  const detailOpen = !!selected;


  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-2">
      {/* Header: title + divider + status tabs (same row) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-2">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Submissions
        </h1>
        <div className="h-4 w-px shrink-0 bg-border" aria-hidden />
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Status">
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
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <span>{label}</span>
                {count !== undefined && (
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
                      isSelected ? "bg-primary-foreground/25" : TAB_BADGE_STYLES[value] ?? "bg-muted"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Single filter bar: Expand/Collapse | View | Sort | Task | Worker | From | To | Search | Clear */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background py-2">
        {params.view === "grouped" && grouped.length > 0 && (
          <>
            <button
              type="button"
              onClick={expandAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Expand all
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Collapse all
            </button>
            <span className="mr-1 w-px self-stretch bg-border" aria-hidden />
          </>
        )}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Sort
        </span>
        <SelectDropdown.Root
          value={params.sort}
          onValueChange={(v) => setParams({ sort: v as "newest" | "oldest" })}
          options={SORT_OPTIONS}
          placeholder="Sort"
        >
          <SelectDropdown.Trigger className="h-8 min-w-[100px] rounded border border-input px-2 text-xs" />
          <SelectDropdown.Content />
        </SelectDropdown.Root>
        <TaskSearchSelect
          value={params.taskId}
          onChange={(v) => setParams({ taskId: v })}
          tasks={tasks}
          placeholder="All tasks"
          isFetching={false}
          className="[&_button]:h-8 [&_button]:min-w-[100px] [&_button]:rounded [&_button]:px-2 [&_button]:text-xs"
        />
        <WorkerSearchSelect
          value={params.workerId}
          onChange={(v) => setParams({ workerId: v })}
          workers={workers}
          placeholder="All workers"
          isFetching={workersFetching}
          className="[&_button]:h-8 [&_button]:min-w-[100px] [&_button]:rounded [&_button]:px-2 [&_button]:text-xs"
        />
        <div className="[&_button]:h-8 [&_button]:min-w-[140px] [&_button]:rounded [&_button]:px-2 [&_button]:text-xs">
          <FilterDateRangePicker
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onChange={({ dateFrom, dateTo }) => setParams({ dateFrom, dateTo })}
            fromPlaceholder="From"
            toPlaceholder="To"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-40 transition-[width] duration-200 focus-within:w-56">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              role="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              aria-label="Search submissions by worker or task"
              className="h-9 pl-8 text-sm"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              aria-label="Clear all filters"
            >
              <X className="size-3.5 shrink-0" />
              Clear filters
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            View
          </span>
          <div className="flex rounded border border-border bg-muted/30 p-0.5">
            {VIEW_MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setParams({ view: value })}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
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
      </div>

      {toast && (
        <div
          role="status"
          className={cn(
            "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg",
            toast.type === "success"
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {toast.message}
        </div>
      )}

      <ConfirmDialogRoot open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <ConfirmDialogContent
          title="Approve submission?"
          description={
            approveTarget
              ? `You are approving ${approveTarget.worker?.name ?? "this worker"}'s submission for '${approveTarget.task?.title ?? "this task"}'. The worker will be notified.`
              : ""
          }
          confirmLabel="Approve"
          variant="default"
          onConfirm={handleApproveConfirm}
          onCancel={() => {
            setApproveDialogOpen(false);
            setApproveTarget(null);
          }}
          loading={reviewMutation.isPending}
        />
      </ConfirmDialogRoot>

      <ConfirmDialogRoot
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setRejectTarget(null);
            setRejectNote("");
          }
        }}
      >
        <RejectDialogContent
          title="Reject submission?"
          description={
            rejectTarget
              ? `You are rejecting ${rejectTarget.worker?.name ?? "this worker"}'s submission for '${rejectTarget.task?.title ?? "this task"}'.`
              : ""
          }
          confirmLabel="Reject"
          rejectNote={rejectNote}
          onRejectNoteChange={setRejectNote}
          onConfirm={handleRejectConfirm}
          onCancel={() => {
            setRejectDialogOpen(false);
            setRejectTarget(null);
            setRejectNote("");
          }}
          loading={reviewMutation.isPending}
        />
      </ConfirmDialogRoot>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message ?? "Failed to load submissions."}</p>
        </div>
      )}

      {!error && (
        <div className="relative flex min-h-0 flex-1 flex-col gap-0">
          {isFetching && (
            <div
              className="absolute left-0 right-0 top-0 z-20 h-0.5 overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <div
                className="h-full w-1/3 rounded-full bg-primary"
                style={{ animation: "loading-bar 1.2s ease-in-out infinite" }}
              />
            </div>
          )}
          {isLoading && submissions.length === 0 ? (
            <SubmissionsSkeleton />
          ) : (
        <div key={params.status} className="flex min-h-0 flex-1 gap-0 transition-opacity duration-200">
          <div className="min-w-0 flex-1">
            {params.view === "grouped" ? (
              <div className="overflow-y-auto pr-1">
                {grouped.length === 0 ? (
                  <SubmissionsEmptyState statusFilter={params.status} className="flex-1" />
                ) : (
                  <div className="space-y-0">
                  {grouped.map(({ taskId, taskTitle, taskType, submissions: list }) => {
                    const isExpanded = expandedTasks.has(taskId);
                    const borderColor = taskType != null ? TYPE_BORDER_COLORS[taskType] : "";
                    return (
                      <div
                        key={taskId}
                        className={cn(
                          "overflow-hidden border-b border-border bg-card last:border-b-0",
                          isExpanded && taskType != null && "border-l-2",
                          isExpanded && borderColor
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTask(taskId)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/40"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                            {taskTitle}
                          </span>
                          {taskType != null && (
                            <span className={cn(
                              "shrink-0 rounded border border-current/20 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                              taskType === "survey" && "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
                              taskType === "content_review" && "bg-violet-500/10 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200",
                              taskType === "data_labeling" && "bg-orange-500/10 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200",
                              taskType === "transcription" && "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200"
                            )}>
                              {taskType === "survey" && "Survey"}
                              {taskType === "content_review" && "Content Review"}
                              {taskType === "data_labeling" && "Data Labeling"}
                              {taskType === "transcription" && "Transcription"}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {list.length} submission{list.length !== 1 ? "s" : ""}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border/60">
                            {list.map((s, idx) => (
                              <div
                                key={s.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelected(s)}
                                onKeyDown={(e) => e.key === "Enter" && setSelected(s)}
                                className={cn(
                                  "grid cursor-pointer grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 py-1.5 pl-6 pr-2 transition-colors hover:bg-muted/30",
                                  selected?.id === s.id && "bg-primary/5",
                                  idx % 2 === 1 && "bg-muted/20"
                                )}
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <WorkerAvatar name={s.worker?.name ?? s.workerId} className="size-6" />
                                  <span className="truncate text-sm font-medium text-foreground">
                                    {s.worker?.name ?? s.workerId}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    "w-fit rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
                                    STATUS_STYLES[s.status]
                                  )}
                                >
                                  {s.status}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTime(s.submittedAt)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {s.proofUrls.length} proof{s.proofUrls.length !== 1 ? "s" : ""}
                                </span>
                                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  {s.status === "pending" ? (
                                    <>
                                      <Tooltip content="Approve">
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="size-7 rounded-full text-green-600 hover:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/20"
                                          onClick={() => handleQuickApprove(s)}
                                          disabled={reviewMutation.isPending}
                                          aria-label="Approve"
                                        >
                                          <Check className="size-3.5" />
                                        </Button>
                                      </Tooltip>
                                      <Tooltip content="Reject">
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="size-7 rounded-full text-destructive hover:bg-destructive/15"
                                          onClick={() => handleQuickReject(s)}
                                          disabled={reviewMutation.isPending}
                                          aria-label="Reject"
                                        >
                                          <X className="size-3.5" />
                                        </Button>
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <span className="w-14 text-[10px] text-muted-foreground">—</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            ) : (
              <div ref={scrollRef} className="h-full overflow-auto">
                {flatItems.length === 0 ? (
                  <SubmissionsEmptyState statusFilter={params.status} className="min-h-[320px]" />
                ) : (
                  <>
                    {/* Table header */}
                    <div className="sticky top-0 z-10 grid grid-cols-[1fr_1fr_7rem_80px_80px_48px_64px] gap-2 border-b border-border bg-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h2 className="font-display text-base font-semibold text-foreground">Submission</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
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
        </div>
      )}

      {isMobile && (
        <SheetRoot open={detailOpen} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent side="bottom" showCloseButton className="max-h-[85vh] flex flex-col p-0">
            <SheetHeader className="shrink-0 border-b border-border px-3 py-2">
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
              "grid cursor-pointer grid-cols-[1fr_1fr_7rem_80px_80px_48px_64px] items-center gap-2 border-b border-border/80 px-3 py-1.5 text-sm transition-colors hover:bg-muted/40",
              selectedId === s.id && "bg-primary/5 ring-inset ring-1 ring-primary/20"
            )}
            onClick={() => onSelect(s)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <WorkerAvatar name={workerName} className="size-6" />
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
                    className="size-8 rounded-full text-green-600 hover:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/20"
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
