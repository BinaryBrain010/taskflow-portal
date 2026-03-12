"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { Task, TaskType, TaskStatus, Submission, SubmissionStatus } from "@/lib/types";
import { useTaskQuery, useUpdateTask, useDeleteTasks } from "@/hooks/useTasks";
import {
  useSubmissionsByTaskQuery,
  useReviewSubmission,
} from "@/hooks/useSubmissions";
import { mockCampaigns } from "@/lib/mock/mockCampaigns";
import { MarkdownContent } from "@/components/feed/MarkdownContent";
import { SubmissionDetailSidebar } from "@/components/admin-submissions/SubmissionDetailSidebar";
import { STATUS_STYLES, formatTime } from "@/components/admin-submissions/SubmissionRow";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip as TooltipUI } from "@/components/ui/tooltip";
import {
  ConfirmDialogRoot,
  ConfirmDialogContent,
} from "@/components/ui/confirm-dialog";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { submissionKeys } from "@/hooks/useSubmissions";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

const TYPE_BADGE: Record<TaskType, string> = {
  survey: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/40",
  content_review: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-300 dark:border-violet-500/40",
  data_labeling: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/40",
  transcription: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/40",
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  draft: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  closed: "bg-muted text-muted-foreground",
};

const PROOF_LABELS: Record<string, string> = {
  screenshot: "Screenshot",
  file: "File",
  url: "URL",
  text: "Text",
  form: "Form",
};

const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  rejected: "var(--destructive)",
};

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getCampaignName(id: string | null): string {
  if (!id) return "—";
  return mockCampaigns.find((c) => c.id === id)?.name ?? id;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function expiresIn(iso: string | null): string {
  if (!iso) return "No expiry";
  const end = new Date(iso).getTime();
  const now = Date.now();
  if (end <= now) return "Expired";
  const days = Math.ceil((end - now) / 86400000);
  return `Expires in ${days} day${days !== 1 ? "s" : ""}`;
}

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

const PAGE_SIZE = 10;
const SUBMISSION_TABS: { value: "all" | SubmissionStatus; label: string }[] = [
  { value: "all", label: "All Submissions" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: task, isLoading: taskLoading, error: taskError } = useTaskQuery(id);
  const { data: submissions = [], isLoading: submissionsLoading } =
    useSubmissionsByTaskQuery(id);

  const [statusTab, setStatusTab] = useState<"all" | SubmissionStatus>("all");
  const [page, setPage] = useState(1);
  const [titleEditing, setTitleEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const updateTask = useUpdateTask();
  const deleteTasks = useDeleteTasks();
  const reviewMutation = useReviewSubmission({
    onSuccess: (updated) => {
      setSelectedSubmission((prev) => (prev?.id === updated.id ? updated : prev));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.byTask(id) });
    },
  });

  useEffect(() => {
    if (task) setEditTitle(task.title);
  }, [task?.title]);

  const filteredSubmissions = useMemo(() => {
    if (statusTab === "all") return submissions;
    return submissions.filter((s) => s.status === statusTab);
  }, [submissions, statusTab]);

  const paginatedSubmissions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSubmissions.slice(start, start + PAGE_SIZE);
  }, [filteredSubmissions, page]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));

  const submissionCounts = useMemo(
    () => ({
      pending: submissions.filter((s) => s.status === "pending").length,
      approved: submissions.filter((s) => s.status === "approved").length,
      rejected: submissions.filter((s) => s.status === "rejected").length,
    }),
    [submissions]
  );

  const donutData = useMemo(
    () => [
      { name: "Pending", value: submissionCounts.pending, fill: SUBMISSION_STATUS_COLORS.pending },
      { name: "Approved", value: submissionCounts.approved, fill: SUBMISSION_STATUS_COLORS.approved },
      { name: "Rejected", value: submissionCounts.rejected, fill: SUBMISSION_STATUS_COLORS.rejected },
    ].filter((d) => d.value > 0),
    [submissionCounts]
  );

  const totalPayout = useMemo(
    () => (task ? task.filledSlots * task.reward : 0),
    [task]
  );

  const handleSaveTitle = useCallback(() => {
    if (!task || editTitle.trim() === task.title) {
      setTitleEditing(false);
      return;
    }
    updateTask.mutate(
      { id: task.id, data: { title: editTitle.trim() } },
      { onSuccess: () => setTitleEditing(false) }
    );
  }, [task, editTitle, updateTask]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    deleteTasks.mutate([id], {
      onSuccess: () => {
        setDeleteOpen(false);
        setToast("Task deleted successfully");
        router.push("/admin/tasks");
      },
    });
  }, [id, deleteTasks, router]);

  const copyTaskId = useCallback(() => {
    if (!id) return;
    void navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [id]);

  const handleQuickApprove = useCallback(
    (s: Submission) => {
      reviewMutation.mutate({ id: s.id, action: "approve" });
    },
    [reviewMutation]
  );

  const handleQuickReject = useCallback(
    (s: Submission) => {
      reviewMutation.mutate({ id: s.id, action: "reject" });
    },
    [reviewMutation]
  );

  const handleReviewed = useCallback((sub: Submission) => {
    setSelectedSubmission((prev) => (prev?.id === sub.id ? sub : prev));
    setToast(sub.status === "approved" ? "Submission approved" : "Submission rejected");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (taskError || (!taskLoading && !task)) {
    return (
      <div className="space-y-6 p-4">
        <Link
          href="/admin/tasks"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Tasks
        </Link>
        <p className="text-destructive">Task not found.</p>
      </div>
    );
  }

  if (taskLoading || !task) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-3/4 max-w-md animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  const slotsRemaining = task.totalSlots - task.filledSlots;

  return (
    <div className="min-w-0 space-y-6 p-3 pb-8 sm:p-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="size-4 shrink-0" />
        <Link href="/admin/tasks" className="hover:text-foreground">
          Tasks
        </Link>
        <ChevronRight className="size-4 shrink-0" />
        <span className="truncate text-foreground">{task.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {titleEditing ? (
            <div className="flex items-center gap-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setEditTitle(task.title);
                    setTitleEditing(false);
                  }
                }}
                className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveTitle}
                disabled={updateTask.isPending}
              >
                {updateTask.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditTitle(task.title);
                  setTitleEditing(false);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div
              className="group flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 hover:bg-muted/50"
              onClick={() => setTitleEditing(true)}
            >
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {task.title}
              </h1>
              <Pencil className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                TYPE_BADGE[task.type]
              )}
            >
              {TYPE_LABELS[task.type]}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                STATUS_BADGE[task.status]
              )}
            >
              {task.status}
            </span>
            {task.campaignId && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {getCampaignName(task.campaignId)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/admin/tasks/${task.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Pencil className="size-4 mr-1.5" />
            Edit task
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4 mr-1.5" />
            Delete task
          </Button>
          <TooltipUI content={copiedId ? "Copied!" : "Copy task ID"}>
            <Button variant="outline" size="icon" onClick={copyTaskId}>
              <Copy className="size-4" />
            </Button>
          </TooltipUI>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total slots
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{task.totalSlots}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Filled slots
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{task.filledSlots}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Slots remaining
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{slotsRemaining}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total reward payout
          </p>
          <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
            {formatReward(totalPayout)}
          </p>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Description */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-foreground">
                Description
              </h2>
              <Link
                href={`/admin/tasks/${task.id}/edit`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <Pencil className="size-4 mr-1" />
                Edit
              </Link>
            </div>
            <div className="mt-3">
              <MarkdownContent content={task.description} />
            </div>
          </div>

          {/* Required proofs */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Required proofs
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(task.requiredProofs ?? []).map((p) => (
                <span
                  key={p}
                  className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {PROOF_LABELS[p] ?? p}
                </span>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-display text-sm font-semibold text-foreground">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Reward per task</dt>
                <dd className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatReward(task.reward)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Campaign</dt>
                <dd className="text-foreground">{getCampaignName(task.campaignId)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">
                  {new Date(task.createdAt).toLocaleString()} ({relativeTime(task.createdAt)})
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expires</dt>
                <dd
                  className={cn(
                    task.expiresAt && new Date(task.expiresAt).getTime() <= Date.now()
                      ? "text-destructive"
                      : "text-foreground"
                  )}
                >
                  {task.expiresAt
                    ? `${new Date(task.expiresAt).toLocaleDateString()} — ${expiresIn(task.expiresAt)}`
                    : "No expiry"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last updated</dt>
                <dd className="text-foreground">
                  {new Date(task.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Submissions overview */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Submissions overview
            </h2>
            {submissionsLoading ? (
              <div className="mt-3 flex h-40 items-center justify-center">
                <div className="size-20 animate-pulse rounded-full bg-muted" />
              </div>
            ) : donutData.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <>
                <div className="mt-3 h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={64}
                        paddingAngle={2}
                        stroke="var(--color-card)"
                        strokeWidth={2}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown) => [String(value ?? 0), "Count"]}
                        contentStyle={{
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Pending: {submissionCounts.pending} · Approved: {submissionCounts.approved} ·
                  Rejected: {submissionCounts.rejected}
                </p>
              </>
            )}
            <Link
              href={`/admin/submissions?taskId=${task.id}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all submissions
              <ExternalLink className="size-3.5" />
            </Link>
          </div>

          {/* Recent submissions */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Recent submissions
            </h2>
            {submissionsLoading ? (
              <ul className="mt-3 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-center gap-2 py-2">
                    <div className="size-8 animate-pulse rounded-full bg-muted" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                  </li>
                ))}
              </ul>
            ) : submissions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <ul className="mt-3 space-y-0 divide-y divide-border">
                {submissions.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSubmission(s)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedSubmission(s)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 py-2.5 pr-2 transition-colors hover:bg-muted/50",
                      selectedSubmission?.id === s.id && "bg-primary/5"
                    )}
                  >
                    <WorkerAvatar
                      name={s.worker?.name ?? s.workerId}
                      className="size-8"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.worker?.name ?? s.workerId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(s.submittedAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        STATUS_STYLES[s.status]
                      )}
                    >
                      {s.status}
                    </span>
                    {s.status === "pending" && (
                      <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 rounded-full text-green-600 hover:bg-green-500/15"
                          onClick={() => handleQuickApprove(s)}
                          disabled={reviewMutation.isPending}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 rounded-full text-destructive hover:bg-destructive/15"
                          onClick={() => handleQuickReject(s)}
                          disabled={reviewMutation.isPending}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {submissions.length > 0 && (
              <Link
                href={`/admin/submissions?taskId=${task.id}`}
                className="mt-3 block text-center text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
          {SUBMISSION_TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatusTab(value);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                statusTab === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {submissionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : paginatedSubmissions.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No submissions in this filter.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Worker</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Proofs</th>
                    <th className="px-4 py-3">Review note</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedSubmissions.map((s) => (
                    <tr
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSubmission(s)}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedSubmission(s)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/30",
                        selectedSubmission?.id === s.id && "bg-primary/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WorkerAvatar
                            name={s.worker?.name ?? s.workerId}
                            className="size-6"
                          />
                          <span className="text-sm font-medium text-foreground">
                            {s.worker?.name ?? s.workerId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            STATUS_STYLES[s.status]
                          )}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatTime(s.submittedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {s.proofUrls?.length ?? 0} proof{(s.proofUrls?.length ?? 0) !== 1 ? "s" : ""}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-sm text-muted-foreground">
                        {s.reviewNote ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {s.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:bg-green-500/15"
                              onClick={() => handleQuickApprove(s)}
                              disabled={reviewMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/15"
                              onClick={() => handleQuickReject(s)}
                              disabled={reviewMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} ({filteredSubmissions.length} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Submission detail sidebar */}
      {!isMobile && selectedSubmission && (
        <aside className="fixed right-0 top-0 z-40 hidden h-full w-full max-w-[min(24rem,90vw)] border-l border-border bg-card shadow-lg md:block">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-base font-semibold text-foreground">
                Submission
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedSubmission(null)}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <SubmissionDetailSidebar
                submission={selectedSubmission}
                onClose={() => setSelectedSubmission(null)}
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

      {isMobile && selectedSubmission && (
        <SheetRoot
          open={!!selectedSubmission}
          onOpenChange={(open) => !open && setSelectedSubmission(null)}
        >
          <SheetContent
            side="bottom"
            showCloseButton
            className="max-h-[85vh] flex flex-col p-0"
          >
            <SheetHeader className="shrink-0 border-b border-border p-4">
              <SheetTitle>Submission</SheetTitle>
            </SheetHeader>
            <SheetBody className="min-h-0 flex-1 overflow-auto">
              <SubmissionDetailSidebar
                submission={selectedSubmission}
                onClose={() => setSelectedSubmission(null)}
                onReviewed={handleReviewed}
                reviewMutation={{
                  mutate: reviewMutation.mutate,
                  isPending: reviewMutation.isPending,
                  isError: reviewMutation.isError,
                  error: reviewMutation.error,
                }}
              />
            </SheetBody>
          </SheetContent>
        </SheetRoot>
      )}

      <ConfirmDialogRoot open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ConfirmDialogContent
          title="Delete task?"
          description={`This will permanently delete "${task.title}" and all its submissions. This action cannot be undone.`}
          confirmLabel="Delete task"
          variant="destructive"
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
          loading={deleteTasks.isPending}
        />
      </ConfirmDialogRoot>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
