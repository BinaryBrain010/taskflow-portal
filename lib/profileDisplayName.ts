/**
 * Worker profile display name (stored in localStorage, keyed by user id).
 * Used on Edit profile page and in the worker shell dropdown.
 */

const STORAGE_KEY = "mtm_profile_display_name";

export function getProfileDisplayName(userId: string): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[userId] ?? "";
  } catch {
    return "";
  }
}

export function setProfileDisplayName(userId: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = (raw ? JSON.parse(raw) : {}) as Record<string, string>;
    if (name.trim()) {
      parsed[userId] = name.trim();
    } else {
      delete parsed[userId];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function getDisplayName(userId: string, fallbackName: string): string {
  const stored = getProfileDisplayName(userId);
  return stored.trim() || fallbackName;
}
