/**
 * App settings persisted in localStorage under key 'app-settings'.
 * Applied on load for theme, accent, font size, font family, table density.
 */

const APP_SETTINGS_KEY = "app-settings";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor =
  | "teal"
  | "indigo"
  | "violet"
  | "orange"
  | "rose"
  | "slate";
export type FontSize = "small" | "medium" | "large";
export type FontFamily =
  | "inter"
  | "geist"
  | "dm-sans"
  | "roboto"
  | "mono";
export type TableDensity = "compact" | "default" | "comfortable";

export interface NotificationSettings {
  notifyNewSubmission: boolean;
  notifyTaskExpiringSoon: boolean;
  notifyTaskSlotsAlmostFull: boolean;
  dailyDigest: boolean;
}

export interface AppSettings {
  theme: ThemeMode;
  accentColor: AccentColor;
  fontSize: FontSize;
  fontFamily: FontFamily;
  sidebarCollapsed: boolean;
  showQuickStats: boolean;
  showPinnedCampaigns: boolean;
  tableDensity: TableDensity;
  notifications: NotificationSettings;
  pinnedCampaignIds: string[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "system",
  accentColor: "teal",
  fontSize: "medium",
  fontFamily: "inter",
  sidebarCollapsed: true,
  showQuickStats: true,
  showPinnedCampaigns: true,
  tableDensity: "default",
  notifications: {
    notifyNewSubmission: true,
    notifyTaskExpiringSoon: true,
    notifyTaskSlotsAlmostFull: true,
    dailyDigest: true,
  },
  pinnedCampaignIds: [],
};

function getStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded
  }
}

export function getAppSettings(): AppSettings {
  const stored = getStored<Partial<AppSettings>>(APP_SETTINGS_KEY);
  if (!stored) return { ...DEFAULT_APP_SETTINGS };
  return {
    ...DEFAULT_APP_SETTINGS,
    ...stored,
    notifications: {
      ...DEFAULT_APP_SETTINGS.notifications,
      ...(stored.notifications ?? {}),
    },
  };
}

export function setAppSettings(partial: Partial<AppSettings>): void {
  const current = getAppSettings();
  const next: AppSettings = {
    ...current,
    ...partial,
    notifications: partial.notifications
      ? { ...current.notifications, ...partial.notifications }
      : current.notifications,
  };
  setStored(APP_SETTINGS_KEY, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-settings-change"));
  }
}

export function getPinnedCampaignIds(): string[] {
  return getAppSettings().pinnedCampaignIds;
}

export function setPinnedCampaignIds(ids: string[]): void {
  setAppSettings({ pinnedCampaignIds: ids.slice(0, 5) });
}

export function addPinnedCampaign(id: string): void {
  const ids = getPinnedCampaignIds();
  if (ids.includes(id) || ids.length >= 5) return;
  setPinnedCampaignIds([...ids, id]);
}

export function removePinnedCampaign(id: string): void {
  setPinnedCampaignIds(getPinnedCampaignIds().filter((x) => x !== id));
}

/** Accent color → CSS primary values (light mode). */
export const ACCENT_PRIMARY: Record<AccentColor, string> = {
  teal: "oklch(0.45 0.11 195)",
  indigo: "oklch(0.45 0.15 265)",
  violet: "oklch(0.50 0.18 290)",
  orange: "oklch(0.65 0.18 45)",
  rose: "oklch(0.55 0.18 350)",
  slate: "oklch(0.45 0.02 260)",
};

/** Font size → px for <html>. */
export const FONT_SIZE_PX: Record<FontSize, number> = {
  small: 13,
  medium: 14,
  large: 16,
};

/** Font family → Google Font name + CSS variable. */
export const FONT_FAMILY_MAP: Record<
  FontFamily,
  { name: string; var: string; googleId?: string }
> = {
  inter: { name: "Inter", var: "var(--font-inter)", googleId: "Inter" },
  geist: { name: "Geist", var: "var(--font-geist)", googleId: "Geist" },
  "dm-sans": { name: "DM Sans", var: "var(--font-dm-sans)", googleId: "DM+Sans" },
  roboto: { name: "Roboto", var: "var(--font-roboto)", googleId: "Roboto" },
  mono: { name: "JetBrains Mono", var: "var(--font-mono)", googleId: "JetBrains+Mono" },
};
