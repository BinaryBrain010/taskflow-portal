"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const TOOLBAR_ACTIONS: { label: string; prefix: string; suffix: string }[] = [
  { label: "Bold", prefix: "**", suffix: "**" },
  { label: "Italic", prefix: "_", suffix: "_" },
  { label: "Code", prefix: "`", suffix: "`" },
  { label: "Link", prefix: "[", suffix: "](url)" },
];

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "rounded p-1.5 text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write description (markdown supported)...",
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(prefix: string, suffix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const newValue = before + prefix + selected + suffix + after;
    onChange(newValue);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }

  return (
    <div className={cn("overflow-hidden rounded-md border border-input bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-2 py-1">
        {TOOLBAR_ACTIONS.map(({ label, prefix, suffix }) => (
          <ToolbarButton
            key={label}
            label={label}
            onClick={() => wrapSelection(prefix, suffix)}
          >
            {label === "Bold" && <span className="font-bold text-sm">B</span>}
            {label === "Italic" && <span className="italic text-sm">I</span>}
            {label === "Code" && <span className="font-mono text-xs">&lt;/&gt;</span>}
            {label === "Link" && <span className="text-sm">🔗</span>}
          </ToolbarButton>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={6}
        className={cn(
          "min-h-[140px] w-full resize-y border-0 bg-transparent px-3 py-2 text-sm outline-none",
          "placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  );
}
