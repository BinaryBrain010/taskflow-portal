import type { Submission } from "@/lib/types";
import { workerUsers } from "./mockUsers";

const WORKER_IDS = workerUsers.map((u) => u.id);

/** Task IDs that exist in taskService seed (expandSeedForFeed: tsk_0001..tsk_2000) */
const TASK_IDS = Array.from({ length: 25 }, (_, i) => `tsk_${String(i + 1).padStart(4, "0")}`);

const PROOF_URLS = [
  "https://example.com/proof/screenshot-1.png",
  "https://example.com/proof/screenshot-2.png",
  "https://example.com/proof/evidence.pdf",
  "https://example.com/proof/result-link.html",
  "https://example.com/proof/uploaded-file.jpg",
  "https://example.com/proof/form-response.pdf",
  "https://example.com/proof/transcription-doc.txt",
];

const REJECT_NOTES = [
  "Proof image too blurry.",
  "Screenshot does not show the required steps.",
  "Missing required proof for step 2.",
  "Link is broken or inaccessible.",
  "Submission does not meet quality guidelines.",
  "Incomplete; please resubmit with all items.",
  "Wrong task format submitted.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(start: Date, end: Date): string {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  ).toISOString();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates at least 40 realistic submissions:
 * - taskId spread across mock tasks
 * - workerId spread across mock workers
 * - status: ~50% pending, ~30% approved, ~20% rejected
 * - proofUrls: 1–3 fake URLs
 * - submittedAt: last 30 days; reviewedAt for approved/rejected; reviewNote for rejected
 */
export function generateMockSubmissions(): Submission[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const list: Submission[] = [];
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  const targetPending = 22;
  const targetApproved = 13;
  const targetRejected = 10;

  for (let i = 0; i < 45; i++) {
    let status: Submission["status"];
    if (pending < targetPending) {
      status = "pending";
      pending++;
    } else if (approved < targetApproved) {
      status = "approved";
      approved++;
    } else {
      status = "rejected";
      rejected++;
    }

    const submittedAt = randomDate(thirtyDaysAgo, now);
    const reviewedAt =
      status === "pending"
        ? null
        : randomDate(new Date(submittedAt), now);
    const updatedAt = reviewedAt ?? submittedAt;

    const numProofs = randomInt(1, 3);
    const proofUrls = Array.from(
      { length: numProofs },
      (_, j) => PROOF_URLS[(i + j) % PROOF_URLS.length]!
    );

    list.push({
      id: `sub_${String(i + 1).padStart(4, "0")}`,
      taskId: TASK_IDS[i % TASK_IDS.length]!,
      workerId: WORKER_IDS[i % WORKER_IDS.length]!,
      status,
      proofUrls,
      submittedAt,
      reviewedAt,
      reviewNote: status === "rejected" ? pick(REJECT_NOTES) : null,
      createdAt: submittedAt,
      updatedAt,
    });
  }

  return list;
}

export const mockSubmissions: Submission[] = generateMockSubmissions();
