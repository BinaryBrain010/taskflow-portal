"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: number | string;
  trend?: { pctChange: number; direction: "up" | "down" | "same"; label?: string };
  sparklineData?: { date: string; count: number }[];
  isLoading?: boolean;
}

export function StatCard({ label, value, trend, sparklineData, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-12 w-full rounded bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {trend && trend.direction !== "same" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              trend.direction === "up" && "text-green-600 dark:text-green-400",
              trend.direction === "down" && "text-destructive"
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="size-3.5" aria-hidden />
            ) : (
              <TrendingDown className="size-3.5" aria-hidden />
            )}
            {trend.pctChange}% {trend.label ?? "from last week"}
          </span>
        )}
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
