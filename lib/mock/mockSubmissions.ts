import type { Submission } from "@/lib/types";
import { mockTasks } from "./mockTasks";
import { workerUsers } from "./mockUsers";

const WORKER_IDS = workerUsers.map((u) => u.id);
const TASK_IDS = mockTasks.map((t) => t.id);
const STATUSES: Submission["status"][] = [
  "pending",
  "submitted",
  "approved",
  "rejected",
  "revision_requested",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(start: Date, end: Date): string {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  ).toISOString();
}

const SAMPLE_CONTENT = [
  "Submitted per instructions. All items completed.",
  "## Summary\n\nCompleted the task as specified. Let me know if you need any changes.",
  "Done. I've followed the guidelines and double-checked the output.",
  "Submission attached. Feedback welcome.",
  "Completed. Please review.",
  "**Results:**\n- Item 1: Done\n- Item 2: Done\n- Item 3: Done",
  "All requirements met. Ready for review.",
  "Submitted. I've added notes where clarification was needed.",
  "Task completed. Output is in the requested format.",
  "Finished. Please see the attached/linked content.",
];

const SAMPLE_FEEDBACK = [
  "Approved. Great work.",
  "Minor edits requested in section 2.",
  "Please resubmit with the correct format.",
  "Rejected: does not meet quality bar. See guidelines.",
  "Approved with thanks.",
  "Revision: add timestamps as specified.",
  "Rejected: too many errors. Please re-read instructions.",
];

function generateSubmission(index: number): Submission {
  const status = pick(STATUSES);
  const createdAt = randomDate(
    new Date("2025-02-01"),
    new Date("2025-03-10")
  );
  const updatedAt = randomDate(new Date(createdAt), new Date("2025-03-10"));
  const submittedAt =
    status !== "pending"
      ? randomDate(new Date(createdAt), new Date(updatedAt))
      : undefined;
  const reviewedAt =
    status === "approved" || status === "rejected"
      ? randomDate(
          new Date(submittedAt ?? createdAt),
          new Date(updatedAt)
        )
      : undefined;

  return {
    id: `sub_${String(index + 1).padStart(4, "0")}`,
    taskId: pick(TASK_IDS),
    userId: pick(WORKER_IDS),
    status,
    content: pick(SAMPLE_CONTENT),
    submittedAt,
    reviewedAt:
      status === "approved" || status === "rejected" ? reviewedAt : undefined,
    reviewedById:
      status === "approved" || status === "rejected" ? "usr_admin_01" : undefined,
    feedback:
      status === "approved" || status === "rejected" || status === "revision_requested"
        ? pick(SAMPLE_FEEDBACK)
        : undefined,
    createdAt,
    updatedAt,
  };
}

export const mockSubmissions: Submission[] = Array.from(
  { length: 120 },
  (_, i) => generateSubmission(i)
);
