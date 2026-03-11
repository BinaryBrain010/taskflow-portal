"use client";

import type { Submission, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

const STATUS_STYLES: Record<Submission["status"], string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-destructive/15 text-destructive",
};

function WorkerAvatar({ name, className }: { name: string; className?: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary",
        className
      )}
    >
      {initial}
    </div>
  );
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

interface RecentSubmissionsTableProps {
  submissions: Submission[];
  isLoading?: boolean;
  selectedId: string | null;
  onSelect: (s: Submission) => void;
}

export function RecentSubmissionsTable({
  submissions,
  isLoading,
  selectedId,
  onSelect,
}: RecentSubmissionsTableProps) {
  const list = submissions.slice(0, 10);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Recent submissions
          </h2>
        </div>
        <div className="divide-y border-border">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="size-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const empty = list.length === 0;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border p-4">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Recent submissions
        </h2>
      </div>
      {empty ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No submissions yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((s) => (
                <tr
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(s)}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(s)}
                  className={cn(
                    "transition-colors hover:bg-muted/40 cursor-pointer",
                    selectedId === s.id && "bg-primary/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <WorkerAvatar name={s.worker?.name ?? s.workerId} />
                      <span className="truncate text-sm font-medium text-foreground">
                        {s.worker?.name ?? s.workerId}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-sm text-foreground">
                    {s.task?.title ?? s.taskId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      {s.task ? TYPE_LABELS[s.task.type] : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        STATUS_STYLES[s.status]
                      )}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {relativeTime(s.submittedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
