"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Task, TaskType } from "@/lib/types";
import { useMemo } from "react";

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

/** Distinct colors per type so segments are always distinguishable */
const TYPE_COLORS: Record<TaskType, string> = {
  survey: "var(--color-chart-1)",       // teal
  content_review: "var(--color-chart-2)", // amber
  data_labeling: "var(--color-chart-3)",  // purple
  transcription: "var(--color-chart-4)",  // green
};

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
      (type) => ({
        name: TYPE_LABELS[type],
        type,
        value: map.get(type) ?? 0,
        fill: TYPE_COLORS[type],
      })
    );
  }, [tasks]);

  const total = tasks.length;

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
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
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="shrink-0 font-display text-sm font-semibold text-foreground">Task type breakdown</h2>
      {empty ? (
        <p className="mt-3 text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <>
          <div className="mt-3 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                <Pie
                  data={data.filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={76}
                  paddingAngle={3}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {data.filter((d) => d.value > 0).map((entry) => (
                    <Cell key={entry.type} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => [String(value ?? 0), "Count"]}
                  contentStyle={{
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
            {data.map((d) => (
              <li key={d.type} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.fill }}
                />
                <span className="text-muted-foreground">
                  {d.name}: <span className="font-medium text-foreground">{d.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
