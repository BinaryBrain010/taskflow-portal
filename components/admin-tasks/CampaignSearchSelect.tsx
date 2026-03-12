"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { Campaign } from "@/lib/mock/mockCampaigns";
import { cn } from "@/lib/utils";

export function CampaignSearchSelect({
  value,
  onChange,
  campaigns,
  disabled,
  className,
  id,
  placeholder = "All campaigns",
}: {
  value: string;
  onChange: (value: string) => void;
  campaigns: Campaign[];
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return campaigns.slice(0, 50);
    return campaigns
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [campaigns, query]);
  const selectedCampaign = value ? campaigns.find((c) => c.id === value) : null;

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
        <span className="truncate">
          {selectedCampaign?.name ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-popover shadow-lg">
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
              All campaigns
            </button>
            {filtered.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                role="option"
                aria-selected={value === campaign.id}
                className={cn(
                  "w-full truncate px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                  value === campaign.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onChange(campaign.id);
                  setOpen(false);
                }}
              >
                {campaign.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
