import type { Submission, Task, User, SubmissionStatus } from "@/lib/types";
import type { SubmissionFilters, CreateSubmissionDTO } from "@/lib/types";
import { getItem, setItem } from "@/lib/mock/storage";
import { readDelay, mutationDelay } from "@/lib/mock/delay";
import { mockUsers } from "@/lib/mock/mockUsers";
import { mockSubmissions } from "@/lib/mock/mockSubmissions";

const SUBMISSIONS_STORAGE_KEY = "submissions" as const;

/** Stored row shape (no task/worker); legacy may have userId, content */
interface StoredSubmission {
  id: string;
  taskId: string;
  workerId?: string;
  userId?: string;
  status: string;
  proofUrls?: string[];
  content?: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

function getStored(): StoredSubmission[] {
  const stored = getItem<StoredSubmission[]>(SUBMISSIONS_STORAGE_KEY);
  if (Array.isArray(stored)) return stored;
  const seed = mockSubmissions.map((s) => ({
    id: s.id,
    taskId: s.taskId,
    workerId: s.workerId,
    status: s.status,
    proofUrls: s.proofUrls,
    submittedAt: s.submittedAt,
    reviewedAt: s.reviewedAt,
    reviewNote: s.reviewNote,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  setItem(SUBMISSIONS_STORAGE_KEY, seed);
  return seed;
}

function getTasksForPopulate(): Task[] {
  const tasks = getItem<Task[]>("tasks");
  return Array.isArray(tasks) ? tasks : [];
}

function getUsersForPopulate(): User[] {
  const users = getItem<User[]>("users");
  return Array.isArray(users) && users.length > 0 ? users : mockUsers;
}

function toSubmission(s: StoredSubmission, task?: Task, worker?: User): Submission {
  const workerId = s.workerId ?? s.userId ?? "";
  const proofUrls = Array.isArray(s.proofUrls)
    ? s.proofUrls
    : s.content
      ? [s.content]
      : [];
  let status: SubmissionStatus = "pending";
  if (s.status === "approved" || s.status === "rejected") status = s.status;
  else if (s.status === "submitted" || s.status === "revision_requested") status = "pending";

  return {
    id: s.id,
    taskId: s.taskId,
    workerId,
    status,
    proofUrls,
    submittedAt: s.submittedAt ?? null,
    reviewedAt: s.reviewedAt ?? null,
    reviewNote: s.reviewNote ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    ...(task && { task }),
    ...(worker && { worker }),
  };
}

function matchesFilters(s: StoredSubmission, filters: SubmissionFilters | undefined): boolean {
  if (!filters) return true;
  if (filters.status != null) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    const normalized = s.status === "submitted" || s.status === "revision_requested" ? "pending" : s.status;
    if (!statuses.includes(normalized as SubmissionStatus)) return false;
  }
  if (filters.taskId != null && s.taskId !== filters.taskId) return false;
  const wid = s.workerId ?? s.userId;
  if (filters.workerId != null && wid !== filters.workerId) return false;
  const submittedAt = s.submittedAt ?? s.createdAt;
  if (filters.dateFrom != null && filters.dateFrom !== "") {
    if (!submittedAt) return false;
    if (new Date(submittedAt).getTime() < new Date(filters.dateFrom).getTime()) return false;
  }
  if (filters.dateTo != null && filters.dateTo !== "") {
    if (!submittedAt) return false;
    if (new Date(submittedAt).getTime() > new Date(filters.dateTo + "T23:59:59.999Z").getTime())
      return false;
  }
  return true;
}

function nextSubmissionId(list: StoredSubmission[]): string {
  const nums = list
    .map((s) => parseInt(s.id.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `sub_${String(max + 1).padStart(4, "0")}`;
}

/**
 * Get submissions with optional filters. 1–3s delay. Returns submissions with task and worker populated.
 * When groupByTask is true, result is sorted by taskId.
 */
export async function getSubmissions(filters?: SubmissionFilters): Promise<Submission[]> {
  await readDelay();
  const list = getStored();
  const tasks = getTasksForPopulate();
  const users = getUsersForPopulate();
  const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));
  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

  let filtered = list.filter((s) => matchesFilters(s, filters));
  if (filters?.groupByTask) {
    filtered = [...filtered].sort((a, b) => a.taskId.localeCompare(b.taskId));
  }

  return filtered.map((s) => {
    const task = taskMap.get(s.taskId);
    const worker = userMap.get(s.workerId ?? s.userId ?? "");
    return toSubmission(s, task, worker);
  });
}

/**
 * Get a single submission by id. 1–3s delay. Returns with task and worker populated.
 */
export async function getSubmissionById(id: string): Promise<Submission | null> {
  await readDelay();
  const list = getStored();
  const tasks = getTasksForPopulate();
  const users = getUsersForPopulate();
  const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));
  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

  const s = list.find((x) => x.id === id);
  if (!s) return null;
  const task = taskMap.get(s.taskId);
  const worker = userMap.get(s.workerId ?? s.userId ?? "");
  return toSubmission(s, task, worker);
}

/**
 * Create a submission. 3–5s delay.
 */
export async function createSubmission(data: CreateSubmissionDTO): Promise<Submission> {
  await mutationDelay();
  const list = getStored();
  const now = new Date().toISOString();
  const proofUrls =
    data.proofUrls?.length ? data.proofUrls : data.content != null ? [data.content] : [];
  const stored: StoredSubmission = {
    id: nextSubmissionId(list),
    taskId: data.taskId,
    workerId: data.workerId,
    status: "pending",
    proofUrls,
    submittedAt: now,
    reviewedAt: null,
    reviewNote: null,
    createdAt: now,
    updatedAt: now,
  };
  list.push(stored);
  setItem(SUBMISSIONS_STORAGE_KEY, list);

  const tasks = getTasksForPopulate();
  const users = getUsersForPopulate();
  const task = tasks.find((t) => t.id === data.taskId);
  const worker = users.find((u) => u.id === data.workerId);
  return toSubmission(stored, task, worker);
}

/**
 * Review a submission (approve or reject). 3–5s delay.
 */
export async function reviewSubmission(
  id: string,
  action: "approve" | "reject",
  note?: string
): Promise<Submission> {
  await mutationDelay();
  const list = getStored();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) throw new Error(`Submission not found: ${id}`);
  const now = new Date().toISOString();
  const status: SubmissionStatus = action === "approve" ? "approved" : "rejected";
  const updated: StoredSubmission = {
    ...list[index]!,
    status,
    reviewedAt: now,
    reviewNote: note ?? null,
    updatedAt: now,
  };
  list[index] = updated;
  setItem(SUBMISSIONS_STORAGE_KEY, list);

  const tasks = getTasksForPopulate();
  const users = getUsersForPopulate();
  const task = tasks.find((t) => t.id === updated.taskId);
  const worker = users.find((u) => u.id === (updated.workerId ?? updated.userId));
  return toSubmission(updated, task, worker);
}

/** Get submissions for a single task (convenience). 1–3s delay. */
export async function getSubmissionsByTaskId(taskId: string): Promise<Submission[]> {
  return getSubmissions({ taskId });
}
