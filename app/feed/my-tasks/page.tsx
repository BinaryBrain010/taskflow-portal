"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Submission, SubmissionStatus } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MyTasksSubmissionCard } from "@/components/feed/MyTasksSubmissionCard";
import { TaskDetailPanel } from "@/components/feed/TaskDetailPanel";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Inbox, Send, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_TABS: { id: SubmissionStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

function formatEarned(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");

  const { data: submissions = [], isLoading } = useSubmissionsQuery(
    user ? { workerId: user.id } : undefined
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return submissions;
    return submissions.filter((s) => s.status === statusFilter);
  }, [submissions, statusFilter]);

  const counts = useMemo(() => {
    const all = submissions.length;
    const pending = submissions.filter((s) => s.status === "pending").length;
    const approved = submissions.filter((s) => s.status === "approved").length;
    const rejected = submissions.filter((s) => s.status === "rejected").length;
    return { all, pending, approved, rejected };
  }, [submissions]);

  const stats = useMemo(() => {
    const approved = submissions.filter((s) => s.status === "approved");
    const totalEarned = approved.reduce((sum, s) => sum + (s.task?.reward ?? 0), 0);
    return {
      totalSubmitted: submissions.length,
      approved: approved.length,
      totalEarnedCents: user?.totalEarned ?? totalEarned,
    };
  }, [submissions, user?.totalEarned]);

  const detailOpen = !!selectedSubmission;
  const selectedTask = selectedSubmission?.task;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          My tasks
        </h1>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6">
          <Inbox className="size-14 text-muted-foreground" />
        </div>
        <h2 className="mt-6 font-display text-xl font-semibold text-foreground">
          No submitted tasks yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Browse the task feed and start earning. Your submitted tasks will appear here.
        </p>
        <Link href="/feed" className={cn(buttonVariants(), "mt-6 inline-flex")}>
          Browse tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-0">
      <div className="min-w-0 flex-1 space-y-6">
      <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
        My tasks
      </h1>

      {/* Stats bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Send className="size-4 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wider">Total submitted</span>
          </div>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">
            {stats.totalSubmitted}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="size-4 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wider">Approved</span>
          </div>
          <p className="mt-1 font-display text-2xl font-semibold text-green-600 dark:text-green-400">
            {stats.approved}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="size-4 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wider">Total earned</span>
          </div>
          <p className="mt-1 font-display text-2xl font-semibold text-primary">
            {formatEarned(stats.totalEarnedCents)}
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto" role="tablist">
        {STATUS_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={statusFilter === id}
            onClick={() => setStatusFilter(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
              statusFilter === id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-xs font-semibold",
                statusFilter === id ? "bg-primary-foreground/25" : "bg-muted"
              )}
            >
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      {/* Submission list */}
      <div className="space-y-3">
        {filtered.map((submission) => (
          <MyTasksSubmissionCard
            key={submission.id}
            submission={submission}
            onClick={() => setSelectedSubmission(submission)}
          />
        ))}
      </div>

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <SheetRoot
          open={detailOpen}
          onOpenChange={(open) => !open && setSelectedSubmission(null)}
        >
          <SheetContent side="bottom" showCloseButton className="max-h-[85vh] flex flex-col p-0">
            <SheetHeader className="shrink-0 border-b border-border p-4">
              <SheetTitle>Submission details</SheetTitle>
            </SheetHeader>
            <SheetBody className="min-h-0 flex-1 overflow-auto">
              {selectedTask && (
                <TaskDetailPanel
                  task={selectedTask}
                  onClose={() => setSelectedSubmission(null)}
                />
              )}
            </SheetBody>
          </SheetContent>
        </SheetRoot>
      )}
      </div>

      {/* Desktop: sidebar */}
      {!isMobile && detailOpen && selectedTask && (
        <aside className="hidden w-full max-w-[min(24rem,90vw)] shrink-0 border-l border-border bg-card md:block">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Submission details
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedSubmission(null)}
                aria-label="Close"
              >
                ×
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <TaskDetailPanel
                task={selectedTask}
                onClose={() => setSelectedSubmission(null)}
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
