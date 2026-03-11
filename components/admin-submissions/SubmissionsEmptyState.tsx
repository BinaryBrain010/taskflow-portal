"use client";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionsEmptyStateProps {
  statusFilter: "all" | "pending" | "approved" | "rejected";
  className?: string;
}

export function SubmissionsEmptyState({ statusFilter, className }: SubmissionsEmptyStateProps) {
  const isPendingOnly = statusFilter === "pending";
  const subtext = isPendingOnly
    ? "All caught up! No pending reviews."
    : "Try adjusting your filters or check back later.";

  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted/50 p-4">
        <Inbox className="size-10 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
        No submissions found
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {subtext}
      </p>
    </div>
  );
}
