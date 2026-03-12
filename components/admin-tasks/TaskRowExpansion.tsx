"use client";

import type { Task } from "@/lib/types";
import { useSubmissionsByTaskQuery } from "@/hooks/useSubmissions";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  approved: "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  rejected: "bg-destructive/15 text-destructive",
  pending: "bg-amber-500/15 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
};

interface TaskRowExpansionProps {
  task: Task;
}

export function TaskRowExpansion({ task }: TaskRowExpansionProps) {
  const { data: submissions = [], isLoading, error } = useSubmissionsByTaskQuery(task.id);
  const slotsLeft = task.totalSlots - task.filledSlots;

  const breakdown = submissions.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="border-l-4 border-l-primary border-t border-border bg-muted/50 p-3">
      <div className="flex flex-wrap gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Slots remaining</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{slotsLeft}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Submission count</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{submissions.length}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Approval breakdown</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(["pending", "approved", "rejected"] as const).map((status) => {
              const count = breakdown[status] ?? 0;
              return (
                <span
                  key={status}
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                    STATUS_BADGE_STYLES[status]
                  )}
                >
                  {STATUS_LABELS[status]}: {count}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="mt-2 text-sm text-muted-foreground">Loading submissions…</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-destructive">{error.message ?? "Failed to load submissions."}</p>
      )}
      {!isLoading && !error && submissions.length > 0 && (
        <div className="mt-3">
          <span className="text-xs text-muted-foreground">
            Submissions for this task
          </span>
          <ul className="mt-1.5 space-y-1">
            {submissions.slice(0, 10).map((s) => (
              <li
                key={s.id}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <span className="font-medium">{s.id}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span
                  className={cn(
                    s.status === "approved" && "text-green-600 dark:text-green-400",
                    s.status === "rejected" && "text-destructive",
                    s.status === "pending" && "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
                {s.submittedAt && (
                  <>
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {new Date(s.submittedAt).toLocaleString()}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {submissions.length > 10 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              +{submissions.length - 10} more
            </p>
          )}
        </div>
      )}
      {!isLoading && !error && submissions.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No submissions yet.</p>
      )}
    </div>
  );
}
