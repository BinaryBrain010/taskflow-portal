"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Task, TaskType } from "@/lib/types";
import { useMemo } from "react";

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

const COLORS = [
  "var(--color-primary)",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--primary) / 0.4)",
];

interface TaskTypeBreakdownProps {
  tasks: Task[];
  isLoading?: boolean;
}

export function TaskTypeBreakdown({ tasks, isLoading }: TaskTypeBreakdownProps) {
  const data = useMemo(() => {
    const map = new Map<TaskType, number>();
    for (const t of tasks) {
      map.set(t.type, (map.get(t.type) ?? 0) + 1);
    }
    return (["survey", "content_review", "data_labeling", "transcription"] as const).map(
      (type, i) => ({
        name: TYPE_LABELS[type],
        type,
        value: map.get(type) ?? 0,
        fill: COLORS[i % COLORS.length],
      })
    );
  }, [tasks]);

  const total = tasks.length;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="font-display text-sm font-semibold text-foreground">Task type breakdown</h2>
        <div className="mt-3 flex h-40 items-center justify-center">
          <div className="size-32 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-4 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const empty = total === 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="font-display text-sm font-semibold text-foreground">Task type breakdown</h2>
      {empty ? (
        <p className="mt-3 text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <>
          <div className="mt-3 h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="var(--color-card)"
                  strokeWidth={1}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.type} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => [String(value ?? 0), "Count"]}
                  contentStyle={{
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}
                />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  formatter={(value, entry) => {
                    const item = entry.payload as { value: number };
                    return `${value} (${item.value})`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
