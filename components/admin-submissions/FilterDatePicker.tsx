"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

/** Value is YYYY-MM-DD for filter range */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function FilterDatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick date",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const display = value
    ? new Date(value + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : placeholder;
  const selectedDate = value ? new Date(value + "T12:00:00") : undefined;

  return (
    <div className="relative">
      <button
        type="button"
        id={id}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full min-w-[120px] items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm shadow-sm transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !value && "text-muted-foreground"
        )}
      >
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{display}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-3 shadow-lg"
            role="dialog"
            aria-label="Pick date"
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onChange(toDateString(date));
                  setOpen(false);
                }
              }}
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
                hidden: "invisible",
              }}
            />
            <div className="mt-2 flex justify-end border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange("");
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
