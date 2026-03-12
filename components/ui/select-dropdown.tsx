"use client";

import { createContext, useContext, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownContextValue {
  value: string;
  onSelect: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  options: SelectOption[];
  displayValue: string;
  loading?: boolean;
}

const SelectDropdownContext = createContext<SelectDropdownContextValue | null>(null);

function useSelectContext() {
  const ctx = useContext(SelectDropdownContext);
  if (!ctx) throw new Error("Select components must be used within SelectDropdown.Root");
  return ctx;
}

interface RootProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
  loading?: boolean;
}

function Root({ value, onValueChange, options, children, placeholder = "Select…", className, loading }: RootProps) {
  const [open, setOpen] = useState(false);
  const displayValue = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <SelectDropdownContext.Provider
      value={{
        value,
        onSelect: onValueChange,
        open,
        setOpen,
        options,
        displayValue,
        loading,
      }}
    >
      <div className={cn("relative", className)}>{children}</div>
    </SelectDropdownContext.Provider>
  );
}

interface TriggerProps {
  children?: React.ReactNode;
  className?: string;
  showSearchIcon?: boolean;
}

function Trigger({ children, className, showSearchIcon }: TriggerProps) {
  const { value, open, setOpen, displayValue, loading } = useSelectContext();
  const ref = useRef<HTMLButtonElement>(null);
  const label = displayValue || (children ?? value ?? "");
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-haspopup="listbox"
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        !value && !displayValue && "text-muted-foreground",
        className
      )}
    >
      {showSearchIcon && <Search className="size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      )}
    </button>
  );
}

interface ContentProps {
  options?: SelectOption[];
  className?: string;
}

function Content({ options: optionsProp, className }: ContentProps) {
  const { value, onSelect, open, setOpen, options: ctxOptions } = useSelectContext();
  const options = optionsProp?.length ? optionsProp : ctxOptions;

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <div
        role="listbox"
        className={cn(
          "absolute top-full z-50 mt-1 max-h-60 w-full min-w-[var(--radix-popper-anchor-width)] overflow-auto rounded-lg border border-border bg-popover py-1 shadow-lg",
          className
        )}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            role="option"
            aria-selected={value === opt.value}
            type="button"
            onClick={() => {
              onSelect(opt.value);
              setOpen(false);
            }}
            className={cn(
              "flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm transition-colors",
              value === opt.value
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}

export const SelectDropdown = { Root, Trigger, Content };
