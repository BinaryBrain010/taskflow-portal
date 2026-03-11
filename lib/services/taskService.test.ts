import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTasks,
  bulkUpdateTasks,
} from "./taskService";
import { STORAGE_KEYS } from "@/lib/mock/storage";
import type { Task, CreateTaskDTO } from "@/lib/types";

vi.mock("@/lib/mock/delay", () => ({
  readDelay: () => Promise.resolve(),
  mutationDelay: () => Promise.resolve(),
}));

const now = new Date().toISOString();
const later = new Date(Date.now() + 86400000).toISOString();

function seedTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "tsk_001",
    title: "Test task",
    description: "Desc",
    type: "survey",
    status: "active",
    reward: 100,
    totalSlots: 10,
    filledSlots: 0,
    campaignId: null,
    requiredProofs: ["form"],
    expiresAt: later,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("taskService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getTasks", () => {
    it("returns empty array when storage is empty then seeds expanded list", async () => {
      const result = await getTasks();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        type: expect.any(String),
        status: expect.any(String),
        reward: expect.any(Number),
      });
    });

    it("returns stored tasks when storage has data", async () => {
      const tasks = [seedTask({ id: "tsk_001" }), seedTask({ id: "tsk_002", title: "Second" })];
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
      const result = await getTasks();
      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe("Test task");
      expect(result[1]?.title).toBe("Second");
    });

    it("filters by status when provided", async () => {
      const tasks = [
        seedTask({ id: "tsk_001", status: "active" }),
        seedTask({ id: "tsk_002", status: "draft" }),
      ];
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
      const result = await getTasks({ status: "active" });
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe("active");
    });

    it("filters by type when provided", async () => {
      const tasks = [
        seedTask({ id: "tsk_001", type: "survey" }),
        seedTask({ id: "tsk_002", type: "content_review" }),
      ];
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
      const result = await getTasks({ type: "survey" });
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("survey");
    });
  });

  describe("getTaskById", () => {
    it("returns task when found", async () => {
      const task = seedTask({ id: "tsk_123" });
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify([task]));
      const result = await getTaskById("tsk_123");
      expect(result).toEqual(task);
    });

    it("returns null when task not found", async () => {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify([seedTask()]));
      const result = await getTaskById("tsk_nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("createTask", () => {
    it("creates task with generated id and timestamps", async () => {
      const dto: CreateTaskDTO = {
        title: "New task",
        description: "Desc",
        type: "survey",
        status: "draft",
        reward: 200,
        totalSlots: 5,
        campaignId: null,
        requiredProofs: ["text"],
        expiresAt: null,
      };
      const created = await createTask(dto);
      expect(created.id).toMatch(/^tsk_\d+$/);
      expect(created.title).toBe("New task");
      expect(created.filledSlots).toBe(0);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it("persists to storage", async () => {
      const dto: CreateTaskDTO = {
        title: "Persisted",
        description: "D",
        type: "survey",
        status: "active",
        reward: 0,
        totalSlots: 1,
        campaignId: null,
        requiredProofs: ["form"],
        expiresAt: null,
      };
      await createTask(dto);
      const raw = localStorage.getItem(STORAGE_KEYS.tasks);
      const stored = JSON.parse(raw!) as Task[];
      expect(stored.some((t) => t.title === "Persisted")).toBe(true);
    });
  });

  describe("updateTask", () => {
    it("updates task and returns updated", async () => {
      const task = seedTask({ id: "tsk_001", title: "Old" });
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify([task]));
      const updated = await updateTask("tsk_001", { title: "New title" });
      expect(updated.title).toBe("New title");
      expect(updated.id).toBe("tsk_001");
    });

    it("throws when task not found", async () => {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify([]));
      await expect(updateTask("tsk_missing", { title: "X" })).rejects.toThrow("Task not found");
    });
  });

  describe("deleteTasks", () => {
    it("removes tasks by ids", async () => {
      const tasks = [
        seedTask({ id: "tsk_001" }),
        seedTask({ id: "tsk_002" }),
        seedTask({ id: "tsk_003" }),
      ];
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
      await deleteTasks(["tsk_001", "tsk_003"]);
      const raw = localStorage.getItem(STORAGE_KEYS.tasks);
      const stored = JSON.parse(raw!) as Task[];
      expect(stored).toHaveLength(1);
      expect(stored[0]?.id).toBe("tsk_002");
    });
  });

  describe("bulkUpdateTasks", () => {
    it("updates reward for selected ids", async () => {
      const tasks = [
        seedTask({ id: "tsk_001", reward: 100 }),
        seedTask({ id: "tsk_002", reward: 200 }),
      ];
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
      const result = await bulkUpdateTasks(["tsk_001", "tsk_002"], { reward: 500 });
      expect(result).toHaveLength(2);
      expect(result[0]?.reward).toBe(500);
      expect(result[1]?.reward).toBe(500);
    });

    it("updates campaignId for selected ids", async () => {
      const tasks = [
        seedTask({ id: "tsk_001", campaignId: null }),
        seedTask({ id: "tsk_002", campaignId: "old" }),
      ];
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
      const result = await bulkUpdateTasks(["tsk_001", "tsk_002"], { campaignId: "camp_new" });
      expect(result[0]?.campaignId).toBe("camp_new");
      expect(result[1]?.campaignId).toBe("camp_new");
    });
  });
});
