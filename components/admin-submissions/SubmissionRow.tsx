"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import type { Submission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const STATUS_STYLES: Record<Submission["status"], string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-destructive/15 text-destructive",
};

const TYPE_LABELS: Record<string, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || url.startsWith("data:image");
}

function ProofThumbnails({ urls }: { urls: string[] }) {
  const preview = urls.slice(0, 3);
  if (preview.length === 0) return <span className="text-xs text-muted-foreground">No proof</span>;
  return (
    <div className="flex gap-1">
      {preview.map((url, i) => (
        <div
          key={i}
          className="h-8 w-8 shrink-0 overflow-hidden rounded border border-border bg-muted"
          title={url}
        >
          {isImageUrl(url) ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              link
            </a>
          )}
        </div>
      ))}
      {urls.length > 3 && (
        <span className="flex items-center text-xs text-muted-foreground">+{urls.length - 3}</span>
      )}
    </div>
  );
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

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface SubmissionRowProps {
  submission: Submission;
  onClick: () => void;
  isSelected?: boolean;
  /** Show quick Approve/Reject buttons for pending (grouped view) */
  onApprove?: (s: Submission) => void;
  onReject?: (s: Submission) => void;
  isReviewPending?: boolean;
}

export function SubmissionRow({
  submission,
  onClick,
  isSelected,
  onApprove,
  onReject,
  isReviewPending,
}: SubmissionRowProps) {
  const workerName = submission.worker?.name ?? submission.workerId;
  const taskTitle = submission.task?.title ?? submission.taskId;
  const isPending = submission.status === "pending";
  const showActions = isPending && (onApprove != null || onReject != null);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20"
      )}
    >
      <WorkerAvatar name={workerName} className="size-9" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{workerName}</span>
          <span className="text-muted-foreground">·</span>
          <Link
            href={`/admin/tasks/${submission.taskId}/edit`}
            className="truncate text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {taskTitle}
          </Link>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium capitalize",
              STATUS_STYLES[submission.status]
            )}
          >
            {submission.status}
          </span>
          <span>{formatTime(submission.submittedAt)}</span>
        </div>
      </div>
      <ProofThumbnails urls={submission.proofUrls} />
      {showActions && (
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 rounded-full text-green-600 hover:bg-green-500/15 hover:text-green-700"
            onClick={() => onApprove?.(submission)}
            disabled={isReviewPending}
            aria-label="Approve"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 rounded-full text-destructive hover:bg-destructive/15"
            onClick={() => onReject?.(submission)}
            disabled={isReviewPending}
            aria-label="Reject"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** Type badge for task type (for group header or table) */
export function TaskTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    survey: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
    content_review: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    data_labeling: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    transcription: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-current/20 px-2.5 py-0.5 text-xs font-medium",
        styles[type] ?? "bg-muted text-muted-foreground"
      )}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
