import type { User } from "@/lib/types";

export const AUTH_STORAGE_KEY = "mtm_auth";
export const AUTH_COOKIE_NAME = "auth_role";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const HARDCODED_ACCOUNTS: Array<{ email: string; password: string; user: User }> = [
  {
    email: "admin@app.com",
    password: "password",
    user: {
      id: "usr_admin_app",
      email: "admin@app.com",
      name: "Admin",
      role: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    email: "worker@app.com",
    password: "password",
    user: {
      id: "usr_worker_app",
      email: "worker@app.com",
      name: "Worker",
      role: "worker",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

export interface AuthSession {
  user: User;
}

export function validateCredentials(
  email: string,
  password: string
): AuthSession | null {
  const normalizedEmail = email.trim().toLowerCase();
  const account = HARDCODED_ACCOUNTS.find(
    (a) => a.email === normalizedEmail && a.password === password
  );
  if (!account) return null;
  return { user: account.user };
}

export function getSessionFromStorage(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user?.id || !parsed?.user?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  document.cookie = `${AUTH_COOKIE_NAME}=${session.user.role}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}
