import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskComposer } from "./TaskComposer";
import type { Task } from "@/lib/types";

vi.mock("@/hooks/useTasks", () => ({
  useCreateTask: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: "tsk_new", title: "New" }),
    isPending: false,
  }),
  useUpdateTask: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: "tsk_1", title: "Updated" }),
    isPending: false,
  }),
}));

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "tsk_001",
    title: "Pre-filled task",
    description: "Pre-filled description",
    type: "content_review",
    status: "active",
    reward: 300,
    totalSlots: 5,
    filledSlots: 0,
    campaignId: null,
    requiredProofs: ["screenshot"],
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("TaskComposer", () => {
  describe("validation", () => {
    it("shows validation errors on submit with empty required fields", async () => {
      const user = userEvent.setup();
      render(<TaskComposer />);
      const submit = screen.getByRole("button", { name: /create task/i });
      await user.click(submit);
      expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    });

    it("shows error when requiredProofs is empty", async () => {
      const user = userEvent.setup();
      render(<TaskComposer />);
      await user.type(screen.getByLabelText(/title/i), "A task");
      const submit = screen.getByRole("button", { name: /create task/i });
      await user.click(submit);
      expect(await screen.findByText(/at least one proof type/i)).toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    it("pre-fills form with task data", () => {
      const task = buildTask({ title: "Pre-filled task", reward: 500, totalSlots: 20 });
      render(<TaskComposer task={task} />);
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput.value).toBe("Pre-filled task");
      const rewardInput = screen.getByLabelText(/reward/i) as HTMLInputElement;
      expect(rewardInput.value).toBe("5"); // 500 cents = $5.00 displayed as dollars
      const slotsInput = screen.getByLabelText(/total slots/i) as HTMLInputElement;
      expect(slotsInput.value).toBe("20");
    });
  });
});
