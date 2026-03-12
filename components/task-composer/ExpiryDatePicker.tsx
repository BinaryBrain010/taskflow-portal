"use client";

import { useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDisplayDate(isoOrLocal: string | null): string {
  if (!isoOrLocal || !isoOrLocal.trim()) return "No date";
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T23:59:00`;
}

export function ExpiryDatePicker({
  value,
  onChange,
  id,
  disabled,
  "aria-invalid": ariaInvalid,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const display = formatDisplayDate(value);
  const selectedDate = value ? new Date(value) : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        aria-invalid={ariaInvalid}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm shadow-sm transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive",
          !value && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{display}</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-full z-50 mt-1 min-w-[min(300px,92vw)] rounded-xl border border-border bg-popover p-3 shadow-lg"
            role="dialog"
            aria-label="Pick expiry date"
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onChange(toLocalDateString(date));
                  setOpen(false);
                }
              }}
              disabled={{ before: new Date() }}
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
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
