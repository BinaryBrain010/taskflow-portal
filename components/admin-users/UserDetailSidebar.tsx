"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { User } from "@/lib/types";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/30",
  worker: "bg-muted text-muted-foreground border-border",
};
const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  suspended: "bg-destructive/15 text-destructive",
};
const SUB_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  approved: "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  rejected: "bg-destructive/15 text-destructive",
};

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface UserDetailSidebarProps {
  user: User;
  onClose?: () => void;
  /** When user clicks Suspend, call this to show confirmation (page handles dialog then mutation). */
  onSuspendClick?: (user: User) => void;
  statusMutation?: { mutate: (args: { id: string; status: "active" | "suspended" }) => void; isPending: boolean };
  className?: string;
}

export function UserDetailSidebar({
  user,
  onClose,
  onSuspendClick,
  statusMutation,
  className,
}: UserDetailSidebarProps) {
  const status = user.status ?? "active";
  const isWorker = user.role === "worker";
  const { data: submissions = [] } = useSubmissionsQuery(
    isWorker ? { workerId: user.id } : undefined
  );
  const recentSubmissions = submissions.slice(0, 5);
  const approved = submissions.filter((s) => s.status === "approved").length;
  const rejected = submissions.filter((s) => s.status === "rejected").length;

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <div className="flex flex-col items-start gap-3">
          <img
            src={user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.id)}`}
            alt=""
            className="size-16 rounded-full border-2 border-border object-cover"
          />
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">{user.name}</h2>
            <div className="mt-1 flex flex-wrap gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  ROLE_STYLES[user.role] ?? "bg-muted text-muted-foreground"
                )}
              >
                {user.role === "admin" ? "Admin" : "Worker"}
              </span>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                  STATUS_STYLES[status]
                )}
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-foreground">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Joined</dt>
            <dd>{formatDate(user.joinedAt ?? user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last active</dt>
            <dd>{formatRelative(user.lastActiveAt)}</dd>
          </div>
        </dl>

        {isWorker && (
          <>
            <section className="mt-6 rounded-lg border border-border bg-muted/20 p-3">
              <h3 className="text-sm font-medium text-foreground">Stats</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total submissions</span>
                  <p className="font-medium text-foreground">{user.totalSubmissions ?? 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Approved</span>
                  <p className="font-medium text-green-600 dark:text-green-400">{approved}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rejected</span>
                  <p className="font-medium text-destructive">{rejected}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total earned</span>
                  <p className="font-medium text-foreground">
                    {formatDollars(user.totalEarned ?? 0)}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <h3 className="text-sm font-medium text-foreground">Recent submissions</h3>
              {recentSubmissions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No submissions yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {recentSubmissions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded border border-border bg-background px-2 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate text-foreground">
                        {s.task?.title ?? s.taskId}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
                          SUB_STATUS_STYLES[s.status]
                        )}
                      >
                        {s.status}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelative(s.submittedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/admin/submissions?workerId=${user.id}`}
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                View all submissions
              </Link>
            </section>
          </>
        )}

        <div className="mt-6">
          {status === "active" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onSuspendClick?.(user)}
              disabled={statusMutation?.isPending}
            >
              Suspend user
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => statusMutation?.mutate({ id: user.id, status: "active" })}
              disabled={statusMutation?.isPending}
            >
              {statusMutation?.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Activate user"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
