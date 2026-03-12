"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { DollarSign } from "lucide-react";

function formatEarned(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function EarningsPage() {
  const { user } = useAuth();
  const { data: submissions = [], isLoading } = useSubmissionsQuery(
    user ? { workerId: user.id } : undefined
  );
  const approved = submissions.filter((s) => s.status === "approved");
  const totalEarnedCents =
    user?.totalEarned ?? approved.reduce((sum, s) => sum + (s.task?.reward ?? 0), 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-12 w-32 animate-pulse rounded-lg bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
        Earnings
      </h1>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <DollarSign className="size-8 text-primary" />
          <span className="text-sm font-medium">Total earned</span>
        </div>
        <p className="mt-2 font-display text-3xl font-bold text-primary">
          {formatEarned(totalEarnedCents)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          From {approved.length} approved submission{approved.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
