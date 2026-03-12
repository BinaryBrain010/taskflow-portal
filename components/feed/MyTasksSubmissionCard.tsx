"use client";

import type { Submission, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

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

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MyTasksSubmissionCardProps {
  submission: Submission;
  onClick: () => void;
}

export function MyTasksSubmissionCard({ submission, onClick }: MyTasksSubmissionCardProps) {
  const task = submission.task;
  const taskType = task?.type ?? "survey";
  const reward = task?.reward ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation min-h-[44px]"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium",
              TYPE_BADGE[taskType]
            )}
          >
            {TYPE_LABELS[taskType]}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              submission.status === "pending" &&
                "bg-amber-500/15 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
              submission.status === "approved" &&
                "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
              submission.status === "rejected" && "bg-destructive/15 text-destructive"
            )}
          >
            {submission.status === "pending" && (
              <>
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
                </span>
                Under review
              </>
            )}
            {submission.status === "approved" && (
              <>
                <Check className="size-3" />
                Approved · {formatReward(reward)} earned
              </>
            )}
            {submission.status === "rejected" && (
              <>
                <X className="size-3" />
                Rejected
              </>
            )}
          </span>
        </div>
        <h3 className="line-clamp-2 font-semibold text-foreground text-sm">
          {task?.title ?? "Task"}
        </h3>
        <p className="text-xs text-muted-foreground">
          Submitted: {formatDate(submission.submittedAt)}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-0 text-xs text-muted-foreground">
          <span>Reward: {formatReward(reward)}</span>
          <span>Proofs: {submission.proofUrls?.length ?? 0}</span>
        </div>
        {submission.status === "rejected" && submission.reviewNote && (
          <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {submission.reviewNote}
          </p>
        )}
      </div>
    </button>
  );
}
