"use client";

import { useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const REWARD_MIN = 0;
const REWARD_MAX = 2000; // $20 in cents
const REWARD_STEP = 25;

export type SlotsLeftFilter = "any" | "has_slots" | "plenty" | "almost_full";
export type ExpiryFilter = "any" | "today" | "week" | "month";

export interface FeedAdvancedFilters {
  rewardMin: number;
  rewardMax: number;
  slotsLeft: SlotsLeftFilter;
  expiry: ExpiryFilter;
}

const DEFAULT_FILTERS: FeedAdvancedFilters = {
  rewardMin: REWARD_MIN,
  rewardMax: REWARD_MAX,
  slotsLeft: "any",
  expiry: "any",
};

export const DEFAULT_FEED_ADVANCED_FILTERS = DEFAULT_FILTERS;

const SLOTS_OPTIONS: { value: SlotsLeftFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "has_slots", label: "Has slots (>0)" },
  { value: "plenty", label: "Plenty (>50%)" },
  { value: "almost_full", label: "Almost full (<10%)" },
];

const EXPIRY_OPTIONS: { value: ExpiryFilter; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Expires today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function formatCentsToDollar(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface FeedFiltersPanelProps {
  filters: FeedAdvancedFilters;
  onFiltersChange: (f: FeedAdvancedFilters) => void;
  onApply: () => void;
  onClear: () => void;
  isOpen: boolean;
}

export function FeedFiltersPanel({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  isOpen,
}: FeedFiltersPanelProps) {
  const rewardMinId = useId();
  const rewardMaxId = useId();
  const slotsId = useId();
  const expiryId = useId();

  const setRewardMin = useCallback(
    (v: number) => {
      const clamped = Math.min(v, filters.rewardMax - REWARD_STEP);
      onFiltersChange({ ...filters, rewardMin: clamped });
    },
    [filters, onFiltersChange]
  );
  const setRewardMax = useCallback(
    (v: number) => {
      const clamped = Math.max(v, filters.rewardMin + REWARD_STEP);
      onFiltersChange({ ...filters, rewardMax: clamped });
    },
    [filters, onFiltersChange]
  );

  if (!isOpen) return null;

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      role="region"
      aria-label="Advanced filters"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Label htmlFor={rewardMinId} className="text-xs font-medium text-muted-foreground">
            Reward range
          </Label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatCentsToDollar(filters.rewardMin)}
            </span>
            <div className="relative flex-1 py-2">
              <input
                type="range"
                id={rewardMinId}
                min={REWARD_MIN}
                max={REWARD_MAX}
                step={REWARD_STEP}
                value={filters.rewardMin}
                onChange={(e) => setRewardMin(Number(e.target.value))}
                className="absolute left-0 right-0 top-1/2 h-2 w-full -translate-y-1/2 appearance-none rounded-full bg-muted accent-primary [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
              />
              <input
                type="range"
                id={rewardMaxId}
                min={REWARD_MIN}
                max={REWARD_MAX}
                step={REWARD_STEP}
                value={filters.rewardMax}
                onChange={(e) => setRewardMax(Number(e.target.value))}
                className="absolute left-0 right-0 top-1/2 h-2 w-full -translate-y-1/2 appearance-none rounded-full bg-transparent accent-primary [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatCentsToDollar(filters.rewardMax)}
            </span>
          </div>
        </div>
        <div>
          <Label htmlFor={slotsId} className="text-xs font-medium text-muted-foreground">
            Slots left
          </Label>
          <Select
            id={slotsId}
            value={filters.slotsLeft}
            onChange={(e) =>
              onFiltersChange({ ...filters, slotsLeft: e.target.value as SlotsLeftFilter })
            }
            className="mt-1 h-8 text-xs"
          >
            {SLOTS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={expiryId} className="text-xs font-medium text-muted-foreground">
            Expiry
          </Label>
          <Select
            id={expiryId}
            value={filters.expiry}
            onChange={(e) =>
              onFiltersChange({ ...filters, expiry: e.target.value as ExpiryFilter })
            }
            className="mt-1 h-8 text-xs"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs">
          Clear filters
        </Button>
        <Button size="sm" onClick={onApply} className="text-xs">
          Apply
        </Button>
      </div>
    </div>
  );
}

export function isDefaultFilters(f: FeedAdvancedFilters): boolean {
  return (
    f.rewardMin === DEFAULT_FILTERS.rewardMin &&
    f.rewardMax === DEFAULT_FILTERS.rewardMax &&
    f.slotsLeft === DEFAULT_FILTERS.slotsLeft &&
    f.expiry === DEFAULT_FILTERS.expiry
  );
}

export function applyAdvancedFilters<T extends { reward: number; totalSlots: number; filledSlots: number; expiresAt: string | null }>(
  items: T[],
  f: FeedAdvancedFilters
): T[] {
  return items.filter((task) => {
    if (task.reward < f.rewardMin || task.reward > f.rewardMax) return false;
    const slotsLeft = task.totalSlots - task.filledSlots;
    const pctLeft = task.totalSlots > 0 ? (slotsLeft / task.totalSlots) * 100 : 0;
    if (f.slotsLeft === "has_slots" && slotsLeft <= 0) return false;
    if (f.slotsLeft === "plenty" && pctLeft <= 50) return false;
    if (f.slotsLeft === "almost_full" && (pctLeft >= 10 || pctLeft === 0)) return false;
    if (f.expiry !== "any" && task.expiresAt) {
      const end = new Date(task.expiresAt).getTime();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = startOfToday.getTime() + 86400000 - 1;
      const endOfWeek = startOfToday.getTime() + 7 * 86400000;
      const endOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      if (f.expiry === "today" && (end < startOfToday.getTime() || end > endOfToday)) return false;
      if (f.expiry === "week" && end > endOfWeek) return false;
      if (f.expiry === "month" && end > endOfMonth) return false;
    }
    return true;
  });
}
