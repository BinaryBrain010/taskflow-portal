"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  Sun,
  Moon,
  Monitor,
  Database,
  Zap,
  Download,
  Trash2,
  LogOut,
  Check,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAppSettings,
  setAppSettings,
  type ThemeMode,
  type AccentColor,
  type FontSize,
  type FontFamily,
  type TableDensity,
  ACCENT_PRIMARY,
  FONT_SIZE_PX,
  FONT_FAMILY_MAP,
} from "@/lib/settings";
import { clearAllMockData } from "@/lib/seed";
import { useAuth } from "@/hooks/useAuth";
import { getItem } from "@/lib/mock/storage";
import { taskKeys } from "@/hooks/useTasks";
import { submissionKeys } from "@/hooks/useSubmissions";
import { userKeys } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ConfirmDialogRoot,
  ConfirmDialogContent,
} from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "appearance", label: "Appearance" },
  { id: "data", label: "Data & Seeding" },
  { id: "notifications", label: "Notifications" },
  { id: "account", label: "Account" },
] as const;

const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: "teal", label: "Teal" },
  { value: "indigo", label: "Indigo" },
  { value: "violet", label: "Violet" },
  { value: "orange", label: "Orange" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; px: number }[] = [
  { value: "small", label: "Small", px: 13 },
  { value: "medium", label: "Medium", px: 14 },
  { value: "large", label: "Large", px: 16 },
];

const FONT_FAMILY_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "geist", label: "Geist" },
  { value: "dm-sans", label: "DM Sans" },
  { value: "roboto", label: "Roboto" },
  { value: "mono", label: "Mono (JetBrains Mono)" },
] as const;

const DENSITY_OPTIONS: { value: TableDensity; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "comfortable", label: "Comfortable" },
];

function loadGoogleFont(familyId: FontFamily): void {
  const config = FONT_FAMILY_MAP[familyId];
  const googleId = config?.googleId ?? "Inter";
  const familyParam = googleId.replace(/\s/g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@400;500;600;700&display=swap`;
  let link = document.querySelector<HTMLLinkElement>(
    `link[data-app-font="${familyId}"]`
  );
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-app-font", familyId);
    document.head.appendChild(link);
  }
}

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("appearance");
  const [settings, setSettingsState] = useState(getAppSettings);
  const [toast, setToast] = useState<string | null>(null);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seedStep, setSeedStep] = useState(0);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileEmail, setProfileEmail] = useState(user?.email ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [user]);

  const applySettings = useCallback((s: ReturnType<typeof getAppSettings>) => {
    setTheme(s.theme);
    document.documentElement.style.setProperty(
      "--primary",
      ACCENT_PRIMARY[s.accentColor]
    );
    document.documentElement.style.fontSize = `${FONT_SIZE_PX[s.fontSize]}px`;
    if (typeof document !== "undefined" && document.body) {
      document.body.setAttribute("data-density", s.tableDensity);
    }
    loadGoogleFont(s.fontFamily);
    const fontName = FONT_FAMILY_MAP[s.fontFamily]?.name ?? "Inter";
    document.documentElement.style.setProperty(
      "--font-sans",
      `"${fontName}", ui-sans-serif, system-ui, sans-serif`
    );
  }, [setTheme]);

  const updateSettings = useCallback(
    (partial: Partial<ReturnType<typeof getAppSettings>>) => {
      setAppSettings(partial);
      const next = getAppSettings();
      setSettingsState(next);
      applySettings(next);
    },
    [applySettings]
  );

  const resolvedTheme = theme ?? "system";
  const themeMode = (resolvedTheme === "light" || resolvedTheme === "dark"
    ? resolvedTheme
    : "system") as ThemeMode;

  const handleSeed = useCallback(async () => {
    setSeedDialogOpen(true);
    setSeedStep(1);
    await new Promise((r) => setTimeout(r, 600));
    setSeedStep(2);
    clearAllMockData();
    await new Promise((r) => setTimeout(r, 600));
    setSeedStep(3);
    await new Promise((r) => setTimeout(r, 600));
    setSeedStep(4);
    await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    await queryClient.invalidateQueries({ queryKey: submissionKeys.all });
    await queryClient.invalidateQueries({ queryKey: userKeys.all });
    await new Promise((r) => setTimeout(r, 600));
    setSeedStep(5);
    await new Promise((r) => setTimeout(r, 400));
    setSeedDialogOpen(false);
    setToast("Data reset and reseeded successfully.");
  }, [queryClient]);

  const handleClear = useCallback(() => {
    clearAllMockData();
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
    queryClient.invalidateQueries({ queryKey: submissionKeys.all });
    queryClient.invalidateQueries({ queryKey: userKeys.all });
    setClearDialogOpen(false);
    setToast("All data cleared.");
  }, [queryClient]);

  const handleExport = useCallback(() => {
    const data = {
      tasks: getItem("tasks"),
      submissions: getItem("submissions"),
      users: getItem("users"),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Export downloaded.");
  }, []);

  const storageUsage = useMemo(() => {
    if (typeof window === "undefined") return 0;
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) total += (localStorage.getItem(key)?.length ?? 0) * 2;
    }
    return Math.round(total / 1024);
  }, [section, toast]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage appearance, data, and account.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <nav
          className="shrink-0 md:sticky md:top-6 md:self-start"
          aria-label="Settings sections"
        >
          <div className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  section === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-10">
          {section === "appearance" && (
            <>
              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Color theme
                </h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {[
                    { value: "light" as const, label: "Light", Icon: Sun },
                    { value: "dark" as const, label: "Dark", Icon: Moon },
                    { value: "system" as const, label: "System", Icon: Monitor },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateSettings({ theme: value })}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                        themeMode === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                      {themeMode === value && (
                        <Check className="size-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Accent color
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ACCENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateSettings({ accentColor: opt.value })}
                      className="relative flex size-10 items-center justify-center rounded-full border-2 transition-colors"
                      style={{
                        backgroundColor: ACCENT_PRIMARY[opt.value],
                        borderColor:
                          settings.accentColor === opt.value
                            ? "var(--primary)"
                            : "transparent",
                      }}
                      title={opt.label}
                    >
                      {settings.accentColor === opt.value && (
                        <Check className="size-5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <Label className="text-sm font-medium text-foreground">
                  Interface font size
                </Label>
                <div className="mt-2 flex rounded-lg border border-border bg-muted/30 p-1">
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateSettings({ fontSize: opt.value })}
                      className={cn(
                        "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        settings.fontSize === opt.value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <Label className="text-sm font-medium text-foreground">
                  Interface font
                </Label>
                <div className="mt-2 max-w-xs">
                  <select
                    value={settings.fontFamily}
                    onChange={(e) =>
                      updateSettings({
                        fontFamily: e.target.value as FontFamily,
                      })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    {FONT_FAMILY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Sidebar
                </h2>
                <div className="mt-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Compact sidebar</p>
                      <p className="text-xs text-muted-foreground">
                        Collapse sidebar to icons only
                      </p>
                    </div>
                    <Switch
                      checked={settings.sidebarCollapsed}
                      onCheckedChange={(c) =>
                        updateSettings({ sidebarCollapsed: c })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Show quick stats</p>
                      <p className="text-xs text-muted-foreground">
                        Pending reviews, active tasks, workers online
                      </p>
                    </div>
                    <Switch
                      checked={settings.showQuickStats}
                      onCheckedChange={(c) =>
                        updateSettings({ showQuickStats: c })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Show pinned campaigns</p>
                      <p className="text-xs text-muted-foreground">
                        Campaign list in sidebar
                      </p>
                    </div>
                    <Switch
                      checked={settings.showPinnedCampaigns}
                      onCheckedChange={(c) =>
                        updateSettings({ showPinnedCampaigns: c })
                      }
                    />
                  </div>
                </div>
              </section>

              <section>
                <Label className="text-sm font-medium text-foreground">
                  Table row density
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DENSITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        updateSettings({ tableDensity: opt.value })
                      }
                      className={cn(
                        "rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors",
                        settings.tableDensity === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {section === "data" && (
            <>
              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Reset & seed mock data
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Wipe all localStorage data and regenerate fresh mock tasks,
                  submissions, and users.
                </p>
                <Button
                  className="mt-3 gap-2"
                  onClick={() => {
                    setSeedStep(0);
                    setSeedDialogOpen(true);
                  }}
                >
                  <Database className="size-4" />
                  <Zap className="size-4" />
                  Seed data
                </Button>
              </section>

              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Export mock data
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Download current localStorage data as JSON.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 gap-2"
                  onClick={handleExport}
                >
                  <Download className="size-4" />
                  Export JSON
                </Button>
              </section>

              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Clear all data
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Remove all data without reseeding.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setClearDialogOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Clear data
                </Button>
              </section>

              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Storage usage
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Using ~{storageUsage} KB of localStorage (limit ~5 MB)
                </p>
                <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (storageUsage / 5120) * 100)}%`,
                    }}
                  />
                </div>
              </section>
            </>
          )}

          {section === "notifications" && (
            <section className="space-y-6">
              {[
                {
                  key: "notifyNewSubmission",
                  label: "Notify on new submission",
                  description: "When a worker submits a task",
                },
                {
                  key: "notifyTaskExpiringSoon",
                  label: "Notify on task expiring soon (< 3 days)",
                  description: "Task expiry reminder",
                },
                {
                  key: "notifyTaskSlotsAlmostFull",
                  label: "Notify on task slots almost full (< 10%)",
                  description: "Slots remaining low",
                },
                {
                  key: "dailyDigest",
                  label: "Daily digest summary",
                  description: "Daily summary of activity",
                },
              ].map(({ key, label, description }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <Switch
                    checked={
                      settings.notifications[
                        key as keyof typeof settings.notifications
                      ]
                    }
                    onCheckedChange={(checked) =>
                      updateSettings({
                        notifications: {
                          ...settings.notifications,
                          [key]: checked,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </section>
          )}

          {section === "account" && user && (
            <>
              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Profile
                </h2>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                      {user.role}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Edit profile
                </h2>
                <div className="mt-3 space-y-3 max-w-sm">
                  <div>
                    <Label htmlFor="profile-name">Name</Label>
                    <Input
                      id="profile-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    disabled={profileSaving}
                    onClick={async () => {
                      setProfileSaving(true);
                      await new Promise((r) => setTimeout(r, 3000));
                      setProfileSaving(false);
                      setToast("Profile updated.");
                    }}
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-medium text-foreground">
                  Change password
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mock: always succeeds after 3s.
                </p>
                <div className="mt-3 space-y-3 max-w-sm">
                  <div>
                    <Label htmlFor="pw-current">Current password</Label>
                    <Input
                      id="pw-current"
                      type="password"
                      value={passwordCurrent}
                      onChange={(e) => setPasswordCurrent(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pw-new">New password</Label>
                    <Input
                      id="pw-new"
                      type="password"
                      value={passwordNew}
                      onChange={(e) => setPasswordNew(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pw-confirm">Confirm new password</Label>
                    <Input
                      id="pw-confirm"
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    disabled={passwordSaving}
                    onClick={async () => {
                      setPasswordSaving(true);
                      await new Promise((r) => setTimeout(r, 3000));
                      setPasswordSaving(false);
                      setPasswordCurrent("");
                      setPasswordNew("");
                      setPasswordConfirm("");
                      setToast("Password updated.");
                    }}
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update password"
                    )}
                  </Button>
                </div>
              </section>

              <section>
                <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4">
                  <h2 className="text-sm font-medium text-destructive">
                    Danger zone
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sign out of all sessions. (Mock: no actual logic.)
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setSignOutAllOpen(true)}
                  >
                    <LogOut className="size-4" />
                    Sign out of all sessions
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 rounded-lg border border-border bg-background px-4 py-2 text-sm shadow-lg"
        >
          {toast}
        </div>
      )}

      <ConfirmDialogRoot
        open={seedDialogOpen}
        onOpenChange={(open) => {
          setSeedDialogOpen(open);
          if (!open) setSeedStep(0);
        }}
      >
        <ConfirmDialogContent
          title="Reset all data?"
          description={
            seedStep > 0 ? null : "This will delete all tasks, submissions, and users and replace them with fresh mock data. This cannot be undone."
          }
          confirmLabel="Yes, reset everything"
          variant="destructive"
          loading={seedStep > 0 && seedStep < 5}
          onConfirm={handleSeed}
          onCancel={() => setSeedDialogOpen(false)}
        >
          {seedStep > 0 && (
            <div className="mt-4 space-y-2 text-sm">
              {[
                "Clearing existing data...",
                "Seeding 50 tasks...",
                "Seeding 15 users...",
                "Seeding 100 submissions...",
                "Done!",
              ].map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-2",
                    seedStep > i + 1 && "text-muted-foreground"
                  )}
                >
                  {seedStep > i + 1 ? (
                    <Check className="size-4 text-primary" />
                  ) : seedStep === i + 1 ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <span className="size-4" />
                  )}
                  {label}
                </div>
              ))}
            </div>
          )}
        </ConfirmDialogContent>
      </ConfirmDialogRoot>

      <ConfirmDialogRoot open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <ConfirmDialogContent
          title="Clear all data?"
          description="This will remove all tasks, submissions, and users. No reseed. This cannot be undone."
          confirmLabel="Yes, clear everything"
          variant="destructive"
          onConfirm={handleClear}
          onCancel={() => setClearDialogOpen(false)}
        />
      </ConfirmDialogRoot>

      <ConfirmDialogRoot open={signOutAllOpen} onOpenChange={setSignOutAllOpen}>
        <ConfirmDialogContent
          title="Sign out of all sessions?"
          description="You will be signed out everywhere."
          confirmLabel="Sign out"
          variant="destructive"
          onConfirm={() => {
            setSignOutAllOpen(false);
            setToast("Signed out of all sessions.");
          }}
          onCancel={() => setSignOutAllOpen(false)}
        />
      </ConfirmDialogRoot>
    </div>
  );
}
