/**
 * localStorage read/write helpers for mock persistence.
 */

const STORAGE_KEYS = {
  users: "mtm_users",
  tasks: "mtm_tasks",
  submissions: "mtm_submissions",
} as const;

export function getItem<T>(key: keyof typeof STORAGE_KEYS): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setItem<T>(key: keyof typeof STORAGE_KEYS, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch {
    // quota exceeded or other storage error
  }
}

export function removeItem(key: keyof typeof STORAGE_KEYS): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS[key]);
}

export { STORAGE_KEYS };
