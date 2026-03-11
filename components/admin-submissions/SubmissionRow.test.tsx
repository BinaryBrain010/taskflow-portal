import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmissionRow } from "./SubmissionRow";
import type { Submission } from "@/lib/types";

function buildSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
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
    worker: { id: "usr_001", name: "Alice", email: "alice@test.com", role: "worker", createdAt: "", updatedAt: "" },
    task: { id: "tsk_001", title: "Review task", description: "", type: "content_review", status: "active", reward: 100, totalSlots: 10, filledSlots: 0, campaignId: null, requiredProofs: [], expiresAt: null, createdAt: "", updatedAt: "" },
    ...overrides,
  };
}

describe("SubmissionRow", () => {
  it("renders worker name, task title, and status badge", () => {
    const submission = buildSubmission();
    render(<SubmissionRow submission={submission} onClick={() => {}} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Review task")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders approved status badge", () => {
    const submission = buildSubmission({ status: "approved" });
    render(<SubmissionRow submission={submission} onClick={() => {}} />);
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("renders workerId when worker not populated", () => {
    const submission = buildSubmission({ worker: undefined });
    render(<SubmissionRow submission={submission} onClick={() => {}} />);
    expect(screen.getByText("usr_001")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SubmissionRow submission={buildSubmission()} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
