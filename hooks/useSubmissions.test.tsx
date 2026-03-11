import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSubmissionsQuery, useSubmissionQuery } from "./useSubmissions";
import type { Submission } from "@/lib/types";
import type { ReactNode } from "react";

const mockSubmission: Submission = {
  id: "sub_001",
  taskId: "tsk_001",
  workerId: "usr_001",
  status: "pending",
  proofUrls: [],
  submittedAt: new Date().toISOString(),
  reviewedAt: null,
  reviewNote: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock("@/lib/services/submissionService", () => ({
  getSubmissions: vi.fn(),
  getSubmissionById: vi.fn(),
  getSubmissionsByTaskId: vi.fn(),
  createSubmission: vi.fn(),
  reviewSubmission: vi.fn(),
}));

import { getSubmissions, getSubmissionById } from "@/lib/services/submissionService";

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

describe("useSubmissionsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSubmissions).mockResolvedValue([mockSubmission]);
  });

  it("starts in loading state", () => {
    const { result } = renderHook(() => useSubmissionsQuery(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const { result } = renderHook(() => useSubmissionsQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([mockSubmission]);
  });

  it("returns error on failure", async () => {
    vi.mocked(getSubmissions).mockRejectedValue(new Error("Fetch failed"));
    const { result } = renderHook(() => useSubmissionsQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe("Fetch failed");
  });
});

describe("useSubmissionQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSubmissionById).mockResolvedValue(mockSubmission);
  });

  it("does not fetch when id is null", () => {
    renderHook(() => useSubmissionQuery(null), {
      wrapper: createWrapper(),
    });
    expect(vi.mocked(getSubmissionById)).not.toHaveBeenCalled();
  });

  it("returns submission when id provided", async () => {
    const { result } = renderHook(() => useSubmissionQuery("sub_001"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(mockSubmission);
  });
});
