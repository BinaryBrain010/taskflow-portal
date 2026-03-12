"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function parseDate(s: string): Date | undefined {
  if (!s || s.trim() === "") return undefined;
  return new Date(s + "T12:00:00");
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface FilterDateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (params: { dateFrom: string; dateTo: string }) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

/**
 * Filter date range picker: one calendar in range mode for From/To.
 * Shows proper range styling (from circle, to circle, middle fill).
 */
export function FilterDateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  id,
  placeholder = "Pick range",
  className,
  triggerClassName,
}: FilterDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);
  const range =
    fromDate && toDate
      ? { from: fromDate, to: toDate }
      : fromDate
        ? { from: fromDate, to: undefined }
        : undefined;

  const display =
    fromDate && toDate
      ? `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${toDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : fromDate
        ? `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – …`
        : placeholder;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={placeholder}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full min-w-[140px] items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !fromDate && !toDate && "text-muted-foreground",
          triggerClassName
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{display}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-auto min-w-[min(300px,92vw)] rounded-xl border border-border bg-popover p-3 shadow-lg"
          role="dialog"
          aria-modal="true"
          aria-label="Pick date range"
        >
          <Calendar
            mode="range"
            selected={range}
            onSelect={(value) => {
              if (value?.from) {
                onChange({
                  dateFrom: toDateString(value.from),
                  dateTo: value.to ? toDateString(value.to) : "",
                });
                if (value.to) setOpen(false);
              }
            }}
            showOutsideDays
            captionLayout="label"
            buttonVariant="ghost"
            className="border-0 bg-transparent p-0 shadow-none"
          />
          <div className="mt-3 flex justify-end border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => {
                onChange({ dateFrom: "", dateTo: "" });
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
