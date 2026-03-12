import type { User, UserStatus, UserRole } from "@/lib/types";
import { getItem, setItem } from "@/lib/mock/storage";
import { readDelay, mutationDelay } from "@/lib/mock/delay";
import { mockUsers } from "@/lib/mock/mockUsers";
import { registerInvitedUser } from "@/lib/auth";

const USERS_STORAGE_KEY = "users" as const;

export interface UserFilters {
  role?: "admin" | "worker" | "all";
  status?: UserStatus | "all";
  search?: string;
  sort?: "newest" | "oldest" | "most_submissions" | "most_earned";
}

export interface CreateUserDTO {
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
}

function getStored(): User[] {
  const stored = getItem<User[]>(USERS_STORAGE_KEY);
  if (Array.isArray(stored)) return stored;
  setItem(USERS_STORAGE_KEY, mockUsers);
  return mockUsers;
}

function matchesFilters(user: User, filters: UserFilters | undefined): boolean {
  if (!filters) return true;
  if (filters.role != null && filters.role !== "all" && user.role !== filters.role) return false;
  const status = user.status ?? "active";
  if (filters.status != null && filters.status !== "all" && status !== filters.status) return false;
  if (filters.search != null && filters.search.trim() !== "") {
    const q = filters.search.trim().toLowerCase();
    const name = (user.name ?? "").toLowerCase();
    const email = (user.email ?? "").toLowerCase();
    if (!name.includes(q) && !email.includes(q)) return false;
  }
  return true;
}

function sortUsers(list: User[], sort: UserFilters["sort"]): User[] {
  const copy = [...list];
  const joined = (u: User) => new Date(u.joinedAt ?? u.createdAt).getTime();
  const submissions = (u: User) => u.totalSubmissions ?? 0;
  const earned = (u: User) => u.totalEarned ?? 0;
  switch (sort) {
    case "oldest":
      copy.sort((a, b) => joined(a) - joined(b));
      break;
    case "most_submissions":
      copy.sort((a, b) => submissions(b) - submissions(a));
      break;
    case "most_earned":
      copy.sort((a, b) => earned(b) - earned(a));
      break;
    case "newest":
    default:
      copy.sort((a, b) => joined(b) - joined(a));
      break;
  }
  return copy;
}

function nextUserId(list: User[]): string {
  const nums = list
    .map((u) => parseInt(u.id.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `usr_${String(max + 1).padStart(4, "0")}`;
}

/**
 * Create a new user (invite). 3–5s delay. Adds user to storage and registers credentials for login.
 */
export async function createUser(dto: CreateUserDTO): Promise<User> {
  await mutationDelay();
  const list = getStored();
  const normalizedEmail = dto.email.trim().toLowerCase();
  if (list.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error("A user with this email already exists");
  }
  const now = new Date().toISOString();
  const id = nextUserId(list);
  const name = dto.name.trim();
  const user: User = {
    id,
    email: normalizedEmail,
    name,
    role: dto.role,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    createdAt: now,
    updatedAt: now,
    joinedAt: now,
    lastActiveAt: now,
    status: dto.status ?? "active",
    totalSubmissions: dto.role === "worker" ? 0 : undefined,
    totalEarned: dto.role === "worker" ? 0 : undefined,
  };
  list.unshift(user);
  setItem(USERS_STORAGE_KEY, list);
  const password = "password";
  registerInvitedUser(normalizedEmail, password, user);
  return user;
}

/**
 * Get users with optional filters. 1–3s delay. Seeds from mockUsers if storage empty.
 */
export async function getUsers(filters?: UserFilters): Promise<User[]> {
  await readDelay();
  const list = getStored();
  const filtered = list.filter((u) => matchesFilters(u, filters));
  return sortUsers(filtered, filters?.sort ?? "newest");
}

/**
 * Get a single user by id. 1–3s delay.
 */
export async function getUserById(id: string): Promise<User | null> {
  await readDelay();
  const list = getStored();
  return list.find((u) => u.id === id) ?? null;
}

/**
 * Update user status (active | suspended). 3–5s delay.
 */
export async function updateUserStatus(id: string, status: UserStatus): Promise<User> {
  await mutationDelay();
  const list = getStored();
  const index = list.findIndex((u) => u.id === id);
  if (index === -1) throw new Error(`User not found: ${id}`);
  const now = new Date().toISOString();
  const updated: User = {
    ...list[index]!,
    status,
    updatedAt: now,
  };
  list[index] = updated;
  setItem(USERS_STORAGE_KEY, list);
  return updated;
}

/**
 * Bulk update status for multiple users. 3–5s delay.
 */
export async function bulkUpdateUserStatus(ids: string[], status: UserStatus): Promise<User[]> {
  await mutationDelay();
  const list = getStored();
  const set = new Set(ids);
  const now = new Date().toISOString();
  const updated: User[] = [];
  for (let i = 0; i < list.length; i++) {
    if (!set.has(list[i]!.id)) continue;
    const next: User = { ...list[i]!, status, updatedAt: now };
    list[i] = next;
    updated.push(next);
  }
  setItem(USERS_STORAGE_KEY, list);
  return updated;
}

/**
 * Delete a user by id. 3–5s delay.
 */
export async function deleteUser(id: string): Promise<void> {
  await mutationDelay();
  const list = getStored();
  const next = list.filter((u) => u.id !== id);
  if (next.length === list.length) throw new Error(`User not found: ${id}`);
  setItem(USERS_STORAGE_KEY, next);
}

/**
 * Bulk delete users by ids. 3–5s delay.
 */
export async function bulkDeleteUsers(ids: string[]): Promise<void> {
  await mutationDelay();
  const list = getStored();
  const set = new Set(ids);
  const next = list.filter((u) => !set.has(u.id));
  setItem(USERS_STORAGE_KEY, next);
}
