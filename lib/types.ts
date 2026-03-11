/**
 * Core domain types for the micro-task marketplace.
 */

export type UserRole = "admin" | "worker";

/** Task type (category) for the task service model */
export type TaskType =
  | "survey"
  | "content_review"
  | "data_labeling"
  | "transcription";

/** Task status for the task service model */
export type TaskStatus = "draft" | "active" | "paused" | "closed";

/** Proof type required for task completion */
export type ProofType = "screenshot" | "file" | "url" | "text" | "form";

/** Task model used by task service and API */
export interface Task {
  id: string;
  title: string;
  description: string; // rich text / markdown
  type: TaskType;
  status: TaskStatus;
  reward: number; // USD cents
  totalSlots: number;
  filledSlots: number;
  campaignId: string | null;
  requiredProofs: ProofType[];
  expiresAt: string | null; // ISO date
  createdAt: string;
  updatedAt: string;
}

/** Filters for getTasks */
export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  type?: TaskType | TaskType[];
  campaignId?: string;
  search?: string;
}

/** DTO for creating a task (filledSlots defaults to 0) */
export type CreateTaskDTO = Omit<Task, "id" | "createdAt" | "updatedAt" | "filledSlots"> & {
  filledSlots?: number;
};

/** Legacy task status (for submissions/mock data) */
export type LegacyTaskStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "review"
  | "completed"
  | "cancelled";

export type SubmissionStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "revision_requested";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string; // ISO date
  updatedAt: string;
}

/** Legacy task shape (mockTasks / submissions) */
export interface LegacyTask {
  id: string;
  title: string;
  description: string;
  instructions: string;
  status: LegacyTaskStatus;
  rewardCents: number;
  maxSubmissions: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
  tags: string[];
}

export interface Submission {
  id: string;
  taskId: string;
  userId: string;
  status: SubmissionStatus;
  content: string; // markdown or structured payload
  submittedAt?: string;
  reviewedAt?: string;
  reviewedById?: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  taskId: string;
  userId: string;
  status: SubmissionStatus;
  content: string; // markdown or structured payload
  submittedAt?: string;
  reviewedAt?: string;
  reviewedById?: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}
