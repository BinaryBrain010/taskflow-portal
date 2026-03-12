"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import { User as UserIcon } from "lucide-react";

function formatEarned(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: submissions = [] } = useSubmissionsQuery(
    user ? { workerId: user.id } : undefined
  );
  const approved = submissions.filter((s) => s.status === "approved");
  const totalEarnedCents =
    user?.totalEarned ?? approved.reduce((sum, s) => sum + (s.task?.reward ?? 0), 0);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
        Profile
      </h1>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
          <UserIcon className="size-4 text-primary" />
          <span className="text-sm font-semibold text-primary">
            Total earned: {formatEarned(totalEarnedCents)}
          </span>
        </div>
      </div>
    </div>
  );
}
