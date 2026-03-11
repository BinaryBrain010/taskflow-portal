import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSubmissions,
  getSubmissionById,
  createSubmission,
  reviewSubmission,
} from "./submissionService";
import { STORAGE_KEYS } from "@/lib/mock/storage";
import type { Task, User, Submission } from "@/lib/types";

vi.mock("@/lib/mock/delay", () => ({
  readDelay: () => Promise.resolve(),
  mutationDelay: () => Promise.resolve(),
}));

const now = new Date().toISOString();

function seedTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "tsk_001",
    title: "Task",
    description: "D",
    type: "survey",
    status: "active",
    reward: 100,
    totalSlots: 10,
    filledSlots: 0,
    campaignId: null,
    requiredProofs: ["form"],
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function seedUser(overrides: Partial<User> = {}): User {
  return {
    id: "usr_001",
    email: "w@test.com",
    name: "Worker",
    role: "worker",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function seedStoredSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_0001",
    taskId: "tsk_001",
    workerId: "usr_001",
    status: "pending",
    proofUrls: ["https://example.com/proof"],
    submittedAt: now,
    reviewedAt: null,
    reviewNote: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("submissionService", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify([seedTask()]));
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify([seedUser()]));
  });

  describe("getSubmissions", () => {
    it("returns empty array when no submissions", async () => {
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify([]));
      const result = await getSubmissions();
      expect(result).toEqual([]);
    });

    it("returns submissions with task and worker populated", async () => {
      const stored = [seedStoredSubmission()];
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(stored));
      const result = await getSubmissions();
      expect(result).toHaveLength(1);
      expect(result[0]?.task?.title).toBe("Task");
      expect(result[0]?.worker?.name).toBe("Worker");
      expect(result[0]?.status).toBe("pending");
    });

    it("filters by status", async () => {
      const stored = [
        seedStoredSubmission({ id: "sub_1", status: "pending" }),
        seedStoredSubmission({ id: "sub_2", status: "approved" }),
      ];
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(stored));
      const result = await getSubmissions({ status: "approved" });
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe("approved");
    });

    it("filters by taskId", async () => {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify([
        seedTask({ id: "tsk_001" }),
        seedTask({ id: "tsk_002", title: "Task 2" }),
      ]));
      const stored = [
        seedStoredSubmission({ id: "sub_1", taskId: "tsk_001" }),
        seedStoredSubmission({ id: "sub_2", taskId: "tsk_002" }),
      ];
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(stored));
      const result = await getSubmissions({ taskId: "tsk_001" });
      expect(result).toHaveLength(1);
      expect(result[0]?.taskId).toBe("tsk_001");
    });
  });

  describe("getSubmissionById", () => {
    it("returns submission when found", async () => {
      const stored = [seedStoredSubmission({ id: "sub_123" })];
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(stored));
      const result = await getSubmissionById("sub_123");
      expect(result?.id).toBe("sub_123");
      expect(result?.task).toBeDefined();
      expect(result?.worker).toBeDefined();
    });

    it("returns null when not found", async () => {
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify([]));
      const result = await getSubmissionById("sub_missing");
      expect(result).toBeNull();
    });
  });

  describe("createSubmission", () => {
    it("creates submission with pending status", async () => {
      const created = await createSubmission({
        taskId: "tsk_001",
        workerId: "usr_001",
        content: "Proof text",
      });
      expect(created.status).toBe("pending");
      expect(created.proofUrls).toEqual(["Proof text"]);
      expect(created.taskId).toBe("tsk_001");
      expect(created.workerId).toBe("usr_001");
    });

    it("uses proofUrls when provided", async () => {
      const created = await createSubmission({
        taskId: "tsk_001",
        workerId: "usr_001",
        proofUrls: ["url1", "url2"],
      });
      expect(created.proofUrls).toEqual(["url1", "url2"]);
    });
  });

  describe("reviewSubmission", () => {
    it("approves and sets reviewedAt and reviewNote", async () => {
      const stored = [seedStoredSubmission({ id: "sub_1" })];
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(stored));
      const result = await reviewSubmission("sub_1", "approve", "Looks good");
      expect(result.status).toBe("approved");
      expect(result.reviewedAt).toBeDefined();
      expect(result.reviewNote).toBe("Looks good");
    });

    it("rejects and sets status", async () => {
      const stored = [seedStoredSubmission({ id: "sub_1" })];
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(stored));
      const result = await reviewSubmission("sub_1", "reject");
      expect(result.status).toBe("rejected");
      expect(result.reviewNote).toBeNull();
    });

    it("throws when submission not found", async () => {
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify([]));
      await expect(reviewSubmission("sub_missing", "approve")).rejects.toThrow(
        "Submission not found"
      );
    });
  });
});
