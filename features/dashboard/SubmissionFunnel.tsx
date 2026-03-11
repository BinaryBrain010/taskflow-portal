"use client";

import type { Submission } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  Submission["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-500" },
  approved: { label: "Approved", className: "bg-green-500" },
  rejected: { label: "Rejected", className: "bg-destructive" },
};

interface SubmissionFunnelProps {
  submissions: Submission[];
  isLoading?: boolean;
}

export function SubmissionFunnel({ submissions, isLoading }: SubmissionFunnelProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="font-display text-sm font-semibold text-foreground">Submission funnel</h2>
        <div className="mt-3 h-8 w-full animate-pulse rounded-full bg-muted" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const total = submissions.length;
  const byStatus = submissions.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<Submission["status"], number>
  );
  const segments: { status: Submission["status"]; count: number; pct: number }[] = (
    ["pending", "approved", "rejected"] as const
  ).map((status) => ({
    status,
    count: byStatus[status] ?? 0,
    pct: total > 0 ? ((byStatus[status] ?? 0) / total) * 100 : 0,
  }));

  const empty = total === 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="font-display text-sm font-semibold text-foreground">Submission funnel</h2>
      {empty ? (
        <p className="mt-3 text-sm text-muted-foreground">No submissions yet.</p>
      ) : (
        <>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full border border-border bg-muted/30">
            {segments.map(({ status, pct }) =>
              pct > 0 ? (
                <div
                  key={status}
                  className={cn("h-full transition-all", STATUS_CONFIG[status].className)}
                  style={{ width: `${pct}%` }}
                  title={`${STATUS_CONFIG[status].label}: ${((byStatus[status] ?? 0) / total * 100).toFixed(0)}%`}
                />
              ) : null
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {segments.map(({ status, count, pct }) => (
              <li key={status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className={cn("size-2 rounded-full", STATUS_CONFIG[status].className)}
                    aria-hidden
                  />
                  {STATUS_CONFIG[status].label}
                </span>
                <span className="text-muted-foreground">
                  {count} ({pct.toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
