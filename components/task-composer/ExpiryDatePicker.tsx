"use client";

import { useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { Calendar } from "lucide-react";
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
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
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
            className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-3 shadow-lg"
            role="dialog"
            aria-label="Pick expiry date"
          >
            <DayPicker
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
              classNames={{
                root: "rdp",
                months: "flex flex-col",
                month: "space-y-4",
                month_caption: "flex justify-center pt-1 font-medium text-sm",
                nav: "flex gap-1",
                button_previous: "size-8 rounded-md border border-input bg-background hover:bg-muted",
                button_next: "size-8 rounded-md border border-input bg-background hover:bg-muted",
                weekdays: "flex",
                weekday: "w-9 rounded-md py-1 text-center text-xs text-muted-foreground",
                week: "flex w-full mt-2",
                day: "size-9 rounded-md p-0 text-center text-sm",
                day_button:
                  "size-9 rounded-md hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring",
                selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                today: "font-medium",
                outside: "text-muted-foreground opacity-50",
                disabled: "opacity-40",
                hidden: "invisible",
              }}
            />
            <div className="mt-2 flex justify-end border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
