"use client";

import { useRef } from "react";
import { Bold, Italic, Code, Link2, Heading1, Heading2, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

const INLINE_ACTIONS: { label: string; prefix: string; suffix: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Bold", prefix: "**", suffix: "**", icon: Bold },
  { label: "Italic", prefix: "_", suffix: "_", icon: Italic },
  { label: "Code", prefix: "`", suffix: "`", icon: Code },
  { label: "Link", prefix: "[", suffix: "](url)", icon: Link2 },
];

const BLOCK_ACTIONS: { label: string; prefix: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Heading 1", prefix: "# ", icon: Heading1 },
  { label: "Heading 2", prefix: "## ", icon: Heading2 },
  { label: "Bullet list", prefix: "- ", icon: List },
  { label: "Numbered list", prefix: "1. ", icon: ListOrdered },
  { label: "Quote", prefix: "> ", icon: Quote },
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
        "rounded-md p-2 text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground",
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

  function insertAtLineStart(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const text = value;
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== "\n") lineStart--;
    const before = text.slice(0, lineStart);
    const rest = text.slice(lineStart);
    onChange(before + prefix + rest);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
    }, 0);
  }

  return (
    <div className={cn("overflow-hidden rounded-md border border-input bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-2 py-1.5">
        {INLINE_ACTIONS.map(({ label, prefix, suffix, icon: Icon }) => (
          <ToolbarButton
            key={label}
            label={label}
            onClick={() => wrapSelection(prefix, suffix)}
          >
            <Icon className="size-4" />
          </ToolbarButton>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {BLOCK_ACTIONS.map(({ label, prefix, icon: Icon }) => (
          <ToolbarButton
            key={label}
            label={label}
            onClick={() => insertAtLineStart(prefix)}
          >
            <Icon className="size-4" />
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
