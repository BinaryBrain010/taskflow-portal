"use client";

import { useState } from "react";
import type { Task, ProofType } from "@/lib/types";
import { MarkdownContent } from "./MarkdownContent";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCreateSubmission } from "@/hooks/useSubmissions";
import { cn } from "@/lib/utils";

const PROOF_LABELS: Record<ProofType, string> = {
  screenshot: "Screenshot",
  file: "File upload",
  url: "URL",
  text: "Text",
  form: "Form response",
};

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface TaskDetailPanelProps {
  task: Task;
  onClose?: () => void;
  className?: string;
}

export function TaskDetailPanel({ task, onClose, className }: TaskDetailPanelProps) {
  const { user } = useAuth();
  const createSubmission = useCreateSubmission();
  const [content, setContent] = useState("");
  const [progress, setProgress] = useState(0);

  const slotsLeft = task.totalSlots - task.filledSlots;
  const isFull = slotsLeft <= 0;
  const isPending = createSubmission.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || isFull || !content.trim()) return;
    setProgress(0);
    const duration = 3000 + Math.random() * 2000;
    const start = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress((prev) => Math.min(100, Math.max(prev, (elapsed / duration) * 100)));
    }, 80);
    try {
      await createSubmission.mutateAsync({
        taskId: task.id,
        userId: user.id,
        content: content.trim(),
      });
      setContent("");
    } finally {
      clearInterval(intervalId);
      setProgress(100);
    }
  }

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">{task.title}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
            {task.type.replace("_", " ")}
          </span>
          <span>{formatReward(task.reward)}</span>
          <span>{slotsLeft} slots left</span>
        </div>

        <section className="mt-4">
          <h3 className="text-sm font-medium text-foreground">Description</h3>
          <div className="mt-1">
            <MarkdownContent content={task.description} />
          </div>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-medium text-foreground">Proof required</h3>
          <ul className="mt-1 flex flex-wrap gap-2">
            {task.requiredProofs.map((p) => (
              <li
                key={p}
                className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {PROOF_LABELS[p]}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-medium text-foreground">Submit your work</h3>
          <form onSubmit={handleSubmit} className="mt-2 space-y-3">
            <div>
              <Label htmlFor="submission-content">Proof / response</Label>
              <textarea
                id="submission-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste links, text, or describe your submission..."
                rows={4}
                disabled={isFull || isPending}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>
            {isPending && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Submitting…</p>
              </div>
            )}
            {createSubmission.isError && (
              <p className="text-sm text-destructive">
                {createSubmission.error?.message ?? "Submission failed."}
              </p>
            )}
            {createSubmission.isSuccess && createSubmission.data && (
              <p className="text-sm text-green-600 dark:text-green-400">Submitted successfully.</p>
            )}
            <Button
              type="submit"
              disabled={isFull || isPending || !content.trim()}
              className="min-h-[44px] touch-manipulation"
            >
              {isFull ? "Task full" : isPending ? "Submitting…" : "Submit"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
