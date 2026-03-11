import type { Submission } from "@/lib/types";
import { getItem, setItem } from "@/lib/mock/storage";
import { readDelay, mutationDelay } from "@/lib/mock/delay";

const SUBMISSIONS_STORAGE_KEY = "submissions" as const;

function getSubmissionsFromStorage(): Submission[] {
  const stored = getItem<Submission[]>(SUBMISSIONS_STORAGE_KEY);
  if (Array.isArray(stored)) return stored;
  return [];
}

function nextSubmissionId(submissions: Submission[]): string {
  const nums = submissions
    .map((s) => parseInt(s.id.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `sub_${String(max + 1).padStart(4, "0")}`;
}

export interface CreateSubmissionDTO {
  taskId: string;
  userId: string;
  content: string;
}

/**
 * Create a submission. 3–5s delay. Persists to localStorage.
 */
export async function createSubmission(dto: CreateSubmissionDTO): Promise<Submission> {
  await mutationDelay();
  const list = getSubmissionsFromStorage();
  const now = new Date().toISOString();
  const submission: Submission = {
    id: nextSubmissionId(list),
    taskId: dto.taskId,
    userId: dto.userId,
    status: "submitted",
    content: dto.content,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  list.push(submission);
  setItem(SUBMISSIONS_STORAGE_KEY, list);
  return submission;
}

/**
 * Get submissions for a task. 1–3s delay.
 */
export async function getSubmissionsByTaskId(taskId: string): Promise<Submission[]> {
  await readDelay();
  const list = getSubmissionsFromStorage();
  return list.filter((s) => s.taskId === taskId);
}
