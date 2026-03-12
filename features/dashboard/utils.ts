/**
 * Dashboard stats derived from tasks and submissions.
 */

import type { Task, Submission } from "@/lib/types";

const MS_PER_DAY = 86400000;

export function getSparklineData(
  items: { createdAt: string }[],
  days = 14
): { date: string; count: number }[] {
  const now = Date.now();
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(now - (i + 1) * MS_PER_DAY);
    const end = new Date(now - i * MS_PER_DAY);
    const startStr = start.toISOString().slice(0, 10);
    const count = items.filter((item) => {
      const t = new Date(item.createdAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    result.push({ date: startStr, count });
  }
  return result;
}

export function getTrendFromLastWeek(
  items: { createdAt: string }[]
): { pctChange: number; direction: "up" | "down" | "same" } {
  const now = Date.now();
  const oneWeekAgo = now - 7 * MS_PER_DAY;
  const twoWeeksAgo = now - 14 * MS_PER_DAY;
  const thisWeek = items.filter((item) => new Date(item.createdAt).getTime() >= oneWeekAgo).length;
  const lastWeek = items.filter((item) => {
    const t = new Date(item.createdAt).getTime();
    return t >= twoWeeksAgo && t < oneWeekAgo;
  }).length;
  if (lastWeek === 0) {
    return { pctChange: thisWeek > 0 ? 100 : 0, direction: thisWeek > 0 ? "up" : "same" };
  }
  const pctChange = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  return {
    pctChange: Math.abs(pctChange),
    direction: pctChange > 0 ? "up" : pctChange < 0 ? "down" : "same",
  };
}

export function getTaskTypeCounts(tasks: Task[]): { type: Task["type"]; count: number }[] {
  const map = new Map<Task["type"], number>();
  for (const t of tasks) {
    map.set(t.type, (map.get(t.type) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
}

export function getSubmissionStatusCounts(
  submissions: Submission[]
): { status: Submission["status"]; count: number }[] {
  const map = new Map<Submission["status"], number>();
  for (const s of submissions) {
    map.set(s.status, (map.get(s.status) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
}
