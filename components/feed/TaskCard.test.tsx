import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/lib/types";

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "tsk_001",
    title: "Product survey",
    description: "Answer questions",
    type: "survey",
    status: "active",
    reward: 250,
    totalSlots: 10,
    filledSlots: 0,
    campaignId: null,
    requiredProofs: ["form"],
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("TaskCard", () => {
  it("renders title, reward, slots, and type badge", () => {
    const task = buildTask({ title: "My Task", reward: 500, totalSlots: 20, filledSlots: 5 });
    const onClick = () => {};
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.getByText("My Task")).toBeInTheDocument();
    expect(screen.getByText("$5.00")).toBeInTheDocument();
    expect(screen.getByText("15 slots left")).toBeInTheDocument();
    expect(screen.getByText("Survey")).toBeInTheDocument();
  });

  it("shows urgency state when slots left less than 10%", () => {
    const taskUrgent = buildTask({ totalSlots: 100, filledSlots: 92 }); // 8 slots left = 8%
    render(<TaskCard task={taskUrgent} onClick={() => {}} />);
    expect(screen.getByText("Almost full")).toBeInTheDocument();
  });

  it("does not show urgency when slots left are 10% or more", () => {
    const task = buildTask({ totalSlots: 10, filledSlots: 8 });
    render(<TaskCard task={task} onClick={() => {}} />);
    expect(screen.queryByText("Almost full")).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const task = buildTask();
    render(<TaskCard task={task} onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /product survey/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders type badge for content_review", () => {
    const task = buildTask({ type: "content_review" });
    render(<TaskCard task={task} onClick={() => {}} />);
    expect(screen.getByText("Content Review")).toBeInTheDocument();
  });
});
