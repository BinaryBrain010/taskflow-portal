"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { searchCampaigns } from "@/lib/mock/mockCampaigns";
import { cn } from "@/lib/utils";

export function CampaignSelect({
  value,
  onChange,
  disabled,
  className,
  id,
  "aria-invalid": ariaInvalid,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const campaigns = useMemo(
    () => searchCampaigns(query),
    [query]
  );
  const selectedLabel = value
    ? campaigns.find((c) => c.id === value)?.name ?? value
    : "Select campaign (optional)";

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-invalid={ariaInvalid}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute top-full z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg"
          role="listbox"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campaigns..."
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
              None
            </button>
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={value === c.id}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                  value === c.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
              >
                {c.name} <span className="text-muted-foreground">({c.id})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
