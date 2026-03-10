import type { Submission } from "@/lib/types";
import { mockTasks } from "./mockTasks";
import { workerUsers } from "./mockUsers";

const WORKER_IDS = workerUsers.map((u) => u.id);
const TASK_IDS = mockTasks.map((t) => t.id);
const STATUSES: Submission["status"][] = ["pending", "approved", "rejected"];

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
  "https://example.com/proof1.png",
  "Done. I've followed the guidelines.",
];

function generateSubmission(index: number): Submission {
  const status = pick(STATUSES);
  const createdAt = randomDate(
    new Date("2025-02-01"),
    new Date("2025-03-10")
  );
  const updatedAt = randomDate(new Date(createdAt), new Date("2025-03-10"));
  const submittedAt = randomDate(new Date(createdAt), new Date(updatedAt));
  const reviewedAt =
    status === "approved" || status === "rejected"
      ? randomDate(new Date(submittedAt), new Date(updatedAt))
      : null;

  return {
    id: `sub_${String(index + 1).padStart(4, "0")}`,
    taskId: pick(TASK_IDS),
    workerId: pick(WORKER_IDS),
    status,
    proofUrls: [pick(SAMPLE_CONTENT)],
    submittedAt,
    reviewedAt,
    reviewNote:
      status === "approved" || status === "rejected" ? "Reviewed." : null,
    createdAt,
    updatedAt,
  };
}

export const mockSubmissions: Submission[] = Array.from(
  { length: 120 },
  (_, i) => generateSubmission(i)
);
