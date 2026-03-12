/**
 * Reset and clear mock data from localStorage.
 * Re-seeding happens lazily when services are next read (getItem returns null).
 */

import { removeItem } from "@/lib/mock/storage";

export function clearAllMockData(): void {
  removeItem("tasks");
  removeItem("submissions");
  removeItem("users");
}
