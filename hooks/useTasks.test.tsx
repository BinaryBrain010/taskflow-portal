import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTasksQuery, useTaskQuery } from "./useTasks";
import { getTasks, getTaskById } from "@/lib/services/taskService";
import type { Task } from "@/lib/types";
import type { ReactNode } from "react";

const mockTask: Task = {
  id: "tsk_001",
  title: "Test",
  description: "D",
  type: "survey",
  status: "active",
  reward: 100,
  totalSlots: 10,
  filledSlots: 0,
  campaignId: null,
  requiredProofs: ["form"],
  expiresAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock("@/lib/services/taskService", () => ({
  getTasks: vi.fn(),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTasks: vi.fn(),
  bulkUpdateTasks: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useTasksQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTasks).mockResolvedValue([mockTask]);
  });

  it("starts in loading state", () => {
    const { result } = renderHook(() => useTasksQuery(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const { result } = renderHook(() => useTasksQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([mockTask]);
  });

  it("returns error on failure", async () => {
    vi.mocked(getTasks).mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useTasksQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe("Network error");
  });
});

describe("useTaskQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTaskById).mockResolvedValue(mockTask);
  });

  it("does not fetch when id is null", () => {
    renderHook(() => useTaskQuery(null), {
      wrapper: createWrapper(),
    });
    expect(vi.mocked(getTaskById)).not.toHaveBeenCalled();
  });

  it("returns task when id provided and found", async () => {
    const { result } = renderHook(() => useTaskQuery("tsk_001"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(mockTask);
  });

  it("returns null when task not found", async () => {
    vi.mocked(getTaskById).mockResolvedValue(null);
    const { result } = renderHook(() => useTaskQuery("tsk_missing"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
  });
});
