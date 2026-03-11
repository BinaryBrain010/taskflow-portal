"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@/lib/types";
import {
  clearSession,
  getSessionFromStorage,
  persistSession,
  validateCredentials,
} from "@/lib/auth";

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(getSessionFromStorage()?.user ?? null);
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: true; user: User } | { ok: false; error: string }> => {
      const session = validateCredentials(email, password);
      if (!session) {
        return { ok: false, error: "Invalid email or password" };
      }
      persistSession(session);
      setUser(session.user);
      return { ok: true, user: session.user };
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return { user, isLoading, login, logout };
}
