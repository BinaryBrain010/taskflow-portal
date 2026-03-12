"use client";

import type { Task, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapPin, Clock, Check, X, ArrowRight } from "lucide-react";

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

const TYPE_COLORS: Record<TaskType, string> = {
  survey: "border-l-indigo-500",
  content_review: "border-l-violet-500",
  data_labeling: "border-l-orange-500",
  transcription: "border-l-cyan-500",
};

const TYPE_BADGE: Record<TaskType, string> = {
  survey: "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  content_review: "bg-violet-500/15 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200",
  data_labeling: "bg-orange-500/15 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200",
  transcription: "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200",
};

export function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function countdownShort(expiresAt: string | null): string {
  if (!expiresAt) return "—";
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  if (end <= now) return "Expired";
  const d = Math.floor((end - now) / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor(((end - now) % 86400000) / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor(((end - now) % 3600000) / 60000);
  return `${m}m`;
}

export function countdownRelative(expiresAt: string | null): string {
  if (!expiresAt) return "—";
  const end = new Date(expiresAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const d = Math.floor((end.getTime() - now.getTime()) / 86400000);
  if (d < 0) return "Expired";
  if (d === 0) return "Today";
  if (d === 1) return "1d";
  if (d < 7) return `${d}d`;
  if (d < 30) return `${Math.floor(d / 7)}w`;
  return `${Math.floor(d / 30)}mo`;
}

export type WorkerSubmissionStatus = "pending" | "approved" | "rejected" | null;

interface FeedTaskCardCompactProps {
  task: Task;
  onClick: () => void;
  isSelected?: boolean;
  workerStatus?: WorkerSubmissionStatus;
}

export function FeedTaskCardCompact({
  task,
  onClick,
  isSelected,
  workerStatus,
}: FeedTaskCardCompactProps) {
  const slotsLeft = task.totalSlots - task.filledSlots;
  const pctFilled = task.totalSlots > 0 ? (task.filledSlots / task.totalSlots) * 100 : 0;
  const pctLeft = 100 - pctFilled;
  const progressVariant =
    pctLeft > 50 ? "bg-green-500" : pctLeft > 10 ? "bg-amber-500" : "bg-destructive";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border border-l-4 border-border bg-card p-3 text-left shadow-sm transition-all duration-200",
        "hover:shadow-sm hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        TYPE_COLORS[task.type],
        isSelected && "ring-2 ring-primary/30 border-primary/50"
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium",
              TYPE_BADGE[task.type]
            )}
          >
            {TYPE_LABELS[task.type]}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 font-semibold text-primary text-sm">
            {formatReward(task.reward)}
            <ArrowRight className="size-3.5" />
          </span>
        </div>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {task.title}
        </h3>
        <div className="flex items-center gap-x-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden />
            {slotsLeft} slots
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3 shrink-0" />
            {countdownShort(task.expiresAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", progressVariant)}
              style={{ width: `${pctFilled}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{Math.round(pctFilled)}% filled</span>
          {workerStatus && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                workerStatus === "approved" &&
                  "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
                workerStatus === "pending" &&
                  "bg-amber-500/15 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
                workerStatus === "rejected" && "bg-destructive/15 text-destructive"
              )}
            >
              {workerStatus === "approved" && (
                <>
                  Approved <Check className="size-2.5 inline" />
                </>
              )}
              {workerStatus === "pending" && "Submitted"}
              {workerStatus === "rejected" && (
                <>
                  Rejected <X className="size-2.5 inline" />
                </>
              )}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
