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
  /** ISO date string; task.expiresAt >= expiresFrom */
  expiresFrom?: string | null;
  /** ISO date string; task.expiresAt <= expiresTo */
  expiresTo?: string | null;
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

/** Submission status for the submission service model */
export type SubmissionStatus = "pending" | "approved" | "rejected";

/** Legacy submission status (for migration / backward compat) */
export type LegacySubmissionStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "revision_requested";

export type UserStatus = "active" | "suspended";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string; // ISO date
  updatedAt: string;
  /** When the user joined (for display); defaults to createdAt */
  joinedAt?: string;
  /** active | suspended */
  status?: UserStatus;
  /** Workers only */
  totalSubmissions?: number;
  /** Workers only; USD cents */
  totalEarned?: number;
  /** Last activity timestamp (ISO) */
  lastActiveAt?: string;
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

/** Submission with optional populated task and worker */
export interface Submission {
  id: string;
  taskId: string;
  workerId: string;
  status: SubmissionStatus;
  proofUrls: string[];
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated when returned from getSubmissions / getSubmissionById */
  task?: Task;
  /** Populated when returned from getSubmissions / getSubmissionById */
  worker?: User;
}

/** Filters for getSubmissions */
export interface SubmissionFilters {
  status?: SubmissionStatus | SubmissionStatus[];
  taskId?: string;
  workerId?: string;
  /** ISO date range for submittedAt */
  dateFrom?: string | null;
  dateTo?: string | null;
  /** When true, result is sorted by taskId so client can group */
  groupByTask?: boolean;
}

/** DTO for creating a submission (proofUrls or content for backward compat) */
export interface CreateSubmissionDTO {
  taskId: string;
  workerId: string;
  proofUrls?: string[];
  /** If proofUrls not provided, single content string is stored as one proof URL. */
  content?: string;
}
