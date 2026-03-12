"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
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
  const uid = useId().replace(/:/g, "");
  const gradientId = `sparkline-${uid}`;

  if (isLoading) {
    return (
      <div className="flex min-h-[140px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-14 w-full rounded bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[140px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {trend && trend.direction !== "same" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              trend.direction === "up" && "bg-green-500/10 text-green-700 dark:bg-green-900/50 dark:text-green-200",
              trend.direction === "down" && "bg-destructive/10 text-destructive"
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
        <div className="mt-4 h-14 w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
