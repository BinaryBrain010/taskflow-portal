"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissionsQuery } from "@/hooks/useSubmissions";
import {
  User,
  Mail,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  LogOut,
  ChevronRight,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearSession } from "@/lib/auth";
import {
  getProfileDisplayName,
  setProfileDisplayName,
} from "@/lib/profileDisplayName";
import { cn } from "@/lib/utils";

function formatEarned(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: submissions = [] } = useSubmissionsQuery(
    user ? { workerId: user.id } : undefined
  );

  useEffect(() => {
    if (user) setDisplayName(getProfileDisplayName(user.id) || user.name);
  }, [user]);

  const approved = submissions.filter((s) => s.status === "approved");
  const pending = submissions.filter((s) => s.status === "pending");
  const rejected = submissions.filter((s) => s.status === "rejected");
  const totalEarnedCents =
    user?.totalEarned ?? approved.reduce((sum, s) => sum + (s.task?.reward ?? 0), 0);

  const displayNameToShow = displayName.trim() || (user?.name ?? "");
  const hasDisplayNameChange =
    user &&
    (displayName.trim() || getProfileDisplayName(user.id)) !==
      (displayName.trim() || user.name);

  const handleSaveProfile = useCallback(() => {
    if (!user) return;
    setProfileDisplayName(user.id, displayName.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [user, displayName]);

  const handleSignOut = useCallback(() => {
    clearSession();
    logout();
    router.replace("/login");
  }, [logout, router]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
        Edit profile
      </h1>

      {/* Profile card */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="size-4" />
          Profile
        </h2>
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {displayNameToShow.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-xs text-muted-foreground">
                Display name
              </Label>
              <Input
                id="profile-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="size-3.5" />
                Email
              </Label>
              <p className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
            {hasDisplayNameChange && (
              <Button
                size="sm"
                onClick={handleSaveProfile}
                className={cn(saved && "bg-green-600 hover:bg-green-600")}
              >
                {saved ? "Saved" : "Save name"}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Earnings summary */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <DollarSign className="size-4 text-primary" />
          Earnings
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-primary">
              {formatEarned(totalEarnedCents)}
            </p>
            <p className="text-xs text-muted-foreground">
              From {approved.length} approved submission{approved.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/feed/earnings"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View details
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Activity / stats */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Activity</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-lg bg-muted/50 px-3 py-3">
            <Clock className="size-5 text-amber-500" />
            <span className="mt-1 text-lg font-semibold text-foreground">{pending.length}</span>
            <span className="text-[10px] text-muted-foreground">Pending</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-muted/50 px-3 py-3">
            <CheckCircle className="size-5 text-green-500" />
            <span className="mt-1 text-lg font-semibold text-foreground">{approved.length}</span>
            <span className="text-[10px] text-muted-foreground">Approved</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-muted/50 px-3 py-3">
            <XCircle className="size-5 text-destructive" />
            <span className="mt-1 text-lg font-semibold text-foreground">{rejected.length}</span>
            <span className="text-[10px] text-muted-foreground">Rejected</span>
          </div>
        </div>
        <Link
          href="/feed/my-tasks"
          className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-muted/50"
        >
          My tasks
          <ChevronRight className="size-4" />
        </Link>
      </section>

      {/* Preferences placeholder */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bell className="size-4" />
          Preferences
        </h2>
        <p className="text-sm text-muted-foreground">
          Notification and display preferences can be managed here in a future update.
        </p>
      </section>

      {/* Sign out */}
      <section>
        <Button
          variant="outline"
          className="w-full border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </Button>
      </section>
    </div>
  );
}
