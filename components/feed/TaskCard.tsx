"use client";

import type { Task, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function countdown(expiresAt: string | null): string {
  if (!expiresAt) return "No expiry";
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  if (end <= now) return "Expired";
  const d = Math.floor((end - now) / 86400000);
  const h = Math.floor(((end - now) % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h left`;
  const m = Math.floor(((end - now) % 3600000) / 60000);
  return `${m}m left`;
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isSelected?: boolean;
}

export function TaskCard({ task, onClick, isSelected }: TaskCardProps) {
  const slotsLeft = task.totalSlots - task.filledSlots;
  const pctLeft = task.totalSlots > 0 ? (slotsLeft / task.totalSlots) * 100 : 0;
  const urgency = pctLeft < 10 && pctLeft > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors",
        "hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "min-h-[120px] touch-manipulation",
        isSelected && "border-primary ring-2 ring-primary/30"
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {TYPE_LABELS[task.type]}
          </span>
          {urgency && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
              Almost full
            </span>
          )}
        </div>
        <h3 className="font-medium text-foreground line-clamp-2">{task.title}</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-primary">{formatReward(task.reward)}</span>
          <span>{slotsLeft} slots left</span>
          <span>{countdown(task.expiresAt)}</span>
        </div>
      </div>
    </button>
  );
}
