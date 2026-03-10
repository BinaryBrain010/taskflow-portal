/**
 * Core domain types for the micro-task marketplace.
 */

export type UserRole = "admin" | "worker";

export type TaskStatus =
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

export interface Task {
  id: string;
  title: string;
  description: string;
  instructions: string; // markdown
  status: TaskStatus;
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
