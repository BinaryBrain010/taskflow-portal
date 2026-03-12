"use client";

import { DatePicker } from "@/components/ui/date-picker";

/** Converts YYYY-MM-DD to Date at noon UTC to avoid timezone shift. */
function parseDate(s: string): Date | undefined {
  if (!s || s.trim() === "") return undefined;
  return new Date(s + "T12:00:00");
}

/** Converts Date to YYYY-MM-DD for filter/API use. */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface FilterDatePickerProps {
  /** Value in YYYY-MM-DD format. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

/**
 * Filter-specific date picker: wraps the reusable DatePicker and converts
 * to/from YYYY-MM-DD string for URL params and API filters.
 */
export function FilterDatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick date",
}: FilterDatePickerProps) {
  const date = parseDate(value);

  return (
    <DatePicker
      id={id}
      value={date}
      onChange={(d) => onChange(d ? toDateString(d) : "")}
      placeholder={placeholder}
      showClear
    />
  );
}
