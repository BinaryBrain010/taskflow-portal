"use client";

import { useMemo } from "react";
import type { Task, Submission } from "@/lib/types";
import { StatCard } from "./StatCard";
import {
  getSparklineData,
  getTrendFromLastWeek,
} from "./utils";
import { mockUsers } from "@/lib/mock/mockUsers";

interface StatsCardsProps {
  tasks: Task[];
  submissions: Submission[];
  isLoadingTasks: boolean;
  isLoadingSubmissions: boolean;
}

export function StatsCards({
  tasks,
  submissions,
  isLoadingTasks,
  isLoadingSubmissions,
}: StatsCardsProps) {
  const totalTasks = tasks.length;
  const activeTasks = useMemo(() => tasks.filter((t) => t.status === "active"), [tasks]);
  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status === "pending"),
    [submissions]
  );
  const workers = useMemo(() => mockUsers.filter((u) => u.role === "worker"), []);

  const tasksTrend = useMemo(() => getTrendFromLastWeek(tasks), [tasks]);
  const activeTrend = useMemo(() => getTrendFromLastWeek(activeTasks), [activeTasks]);
  const pendingTrend = useMemo(() => getTrendFromLastWeek(pendingSubmissions), [pendingSubmissions]);

  const tasksSpark = useMemo(() => getSparklineData(tasks), [tasks]);
  const activeSpark = useMemo(() => getSparklineData(activeTasks), [activeTasks]);
  const pendingSpark = useMemo(() => getSparklineData(pendingSubmissions), [submissions]);

  const loading = isLoadingTasks || isLoadingSubmissions;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total tasks"
        value={totalTasks}
        trend={{ ...tasksTrend, label: "from last week" }}
        sparklineData={tasksSpark}
        isLoading={loading}
      />
      <StatCard
        label="Active tasks"
        value={activeTasks.length}
        trend={{ ...activeTrend, label: "from last week" }}
        sparklineData={activeSpark}
        isLoading={loading}
      />
      <StatCard
        label="Pending submissions"
        value={pendingSubmissions.length}
        trend={{ ...pendingTrend, label: "from last week" }}
        sparklineData={pendingSpark}
        isLoading={loading}
      />
      <StatCard
        label="Total workers"
        value={workers.length}
        isLoading={loading}
      />
    </div>
  );
}
