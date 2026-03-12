"use client";

import Link from "next/link";
import type { Task, TaskType, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  paused: "bg-amber-500/15 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  closed: "bg-muted text-muted-foreground",
};

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface RecentTasksProps {
  tasks: Task[];
  isLoading?: boolean;
}

export function RecentTasks({ tasks, isLoading }: RecentTasksProps) {
  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-sm font-semibold text-foreground">Recent tasks</h2>
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border p-2">
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const list = tasks.slice(0, 5);
  const empty = list.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex shrink-0 items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-foreground">Recent tasks</h2>
        <Link
          href="/admin/tasks"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all tasks
        </Link>
      </div>
      {empty ? (
        <p className="mt-3 text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((task) => (
            <li key={task.id}>
              <Link
                href={`/admin/tasks/${task.id}`}
                className="flex flex-wrap items-center gap-2 rounded-md border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/30"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {task.title}
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  {TYPE_LABELS[task.type]}
                </span>
                <span className="text-xs font-medium text-primary">{formatReward(task.reward)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_STYLES[task.status]
                  )}
                >
                  {task.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
