"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  /** Current value; undefined = no selection. */
  value?: Date;
  /** Called when user selects a date or clears. */
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Show Clear button in footer. Default true. */
  showClear?: boolean;
  className?: string;
  /** Content for trigger; defaults to formatted date or placeholder. */
  triggerClassName?: string;
}

const defaultFormat = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Reusable single-date picker: trigger + popover with calendar.
 * Scalable and suitable for filters, forms, and any single-date selection.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick date",
  id,
  disabled = false,
  showClear = true,
  className,
  triggerClassName,
}: DatePickerProps) {
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

  const display = value ? defaultFormat(value) : placeholder;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={placeholder}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full min-w-[120px] items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          !value && "text-muted-foreground",
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
          aria-label="Pick date"
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (date) {
                onChange(date);
                setOpen(false);
              }
            }}
            showOutsideDays
            captionLayout="label"
            buttonVariant="ghost"
            className="border-0 bg-transparent p-0 shadow-none"
          />
          {showClear && (
            <div className="mt-3 flex justify-end border-t border-border pt-3">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
