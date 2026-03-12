"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskSearchSelect({
  value,
  onChange,
  tasks,
  disabled,
  className,
  id,
  placeholder = "All tasks",
  isFetching,
}: {
  value: string;
  onChange: (value: string) => void;
  tasks: Task[];
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  /** When true, show spinner in trigger instead of chevron (e.g. submissions loading). */
  isFetching?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks.slice(0, 50);
    return tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
      .slice(0, 50);
  }, [tasks, query]);
  const selectedTask = value ? tasks.find((t) => t.id === value) : null;

  // Close when clicking outside (blur would fire when focus moves to the dropdown input, so we use click-outside)
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full min-w-[160px] items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selectedTask?.title ?? placeholder}</span>
        {isFetching ? (
          <Loader2 className="size-4 shrink-0 animate-spin opacity-60" aria-hidden />
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        )}
      </button>
      {open && (
        <div className="absolute top-full z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-popover shadow-lg">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <div className="max-h-48 overflow-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                !value && "bg-accent text-accent-foreground"
              )}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              All tasks
            </button>
            {filtered.map((task) => (
              <button
                key={task.id}
                type="button"
                role="option"
                aria-selected={value === task.id}
                className={cn(
                  "w-full truncate px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                  value === task.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onChange(task.id);
                  setOpen(false);
                }}
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
