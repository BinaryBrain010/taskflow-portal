"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check, Loader2, LogOut } from "lucide-react";
import {
  getAppSettings,
  setAppSettings,
  type ThemeMode,
  type AccentColor,
  type FontSize,
  type FontFamily,
  ACCENT_PRIMARY,
  FONT_SIZE_PX,
  FONT_FAMILY_MAP,
} from "@/lib/settings";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ConfirmDialogRoot,
  ConfirmDialogContent,
} from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const WORKER_SECTIONS = [
  { id: "appearance", label: "Appearance" },
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

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const FONT_FAMILY_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "geist", label: "Geist" },
  { value: "dm-sans", label: "DM Sans" },
  { value: "roboto", label: "Roboto" },
  { value: "mono", label: "Mono (JetBrains Mono)" },
] as const;

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

export default function WorkerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [section, setSection] = useState<(typeof WORKER_SECTIONS)[number]["id"]>("appearance");
  const [settings, setSettingsState] = useState(getAppSettings);
  const [toast, setToast] = useState<string | null>(null);
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage appearance and account.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <nav
          className="shrink-0 md:sticky md:top-6 md:self-start"
          aria-label="Settings sections"
        >
          <div className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
            {WORKER_SECTIONS.map((s) => (
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
            </>
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
