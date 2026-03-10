"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  if (!content.trim()) return <p className={cn("text-sm text-muted-foreground", className)}>No description.</p>;
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-p:text-foreground prose-headings:font-display prose-headings:text-foreground",
        "prose-a:text-primary prose-strong:text-foreground prose-code:bg-muted prose-code:rounded prose-code:px-1",
        className
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
