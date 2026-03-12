"use client";

import { useState, useMemo, useCallback } from "react";
import type { Task, ProofType } from "@/lib/types";
import { MarkdownContent } from "./MarkdownContent";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useCreateSubmission, useSubmissionsQuery } from "@/hooks/useSubmissions";
import { cn } from "@/lib/utils";
import { Check, ImageIcon, FileIcon, LinkIcon, TypeIcon, FileTextIcon } from "lucide-react";

const PROOF_LABELS: Record<ProofType, string> = {
  screenshot: "Screenshot",
  file: "File upload",
  url: "URL",
  text: "Text",
  form: "Form response",
};

const PROOF_ICONS: Record<ProofType, React.ComponentType<{ className?: string }>> = {
  screenshot: ImageIcon,
  file: FileIcon,
  url: LinkIcon,
  text: TypeIcon,
  form: FileTextIcon,
};

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function expiresIn(iso: string | null): string {
  if (!iso) return "No expiry";
  const end = new Date(iso).getTime();
  const now = Date.now();
  if (end <= now) return "Expired";
  const days = Math.ceil((end - now) / 86400000);
  return `Expires in ${days} day${days !== 1 ? "s" : ""}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface TaskDetailPanelProps {
  task: Task;
  onClose?: () => void;
  className?: string;
}

export function TaskDetailPanel({ task, onClose, className }: TaskDetailPanelProps) {
  const { user } = useAuth();
  const createSubmission = useCreateSubmission();
  const workerTaskFilters = useMemo(
    () => (user ? { taskId: task.id, workerId: user.id } : undefined),
    [task.id, user?.id]
  );
  const { data: mySubmissions = [], refetch: refetchSubmissions } =
    useSubmissionsQuery(workerTaskFilters);
  const mySubmission = mySubmissions[0] ?? null;

  const [proofValues, setProofValues] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [progress, setProgress] = useState(0);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const isMobile = useIsMobile();
  const slotsLeft = task.totalSlots - task.filledSlots;
  const isFull = slotsLeft <= 0;
  const pctLeft = task.totalSlots > 0 ? (slotsLeft / task.totalSlots) * 100 : 0;
  const slotsUrgency =
    pctLeft <= 0 ? "full" : pctLeft < 10 ? "critical" : pctLeft < 50 ? "amber" : "neutral";
  const isPending = createSubmission.isPending;

  const canSubmit = useMemo(() => {
    if (isFull || !user) return false;
    for (const p of task.requiredProofs ?? []) {
      if (p === "screenshot" || p === "file") {
        if (!proofFiles[p]) return false;
      } else {
        if (!proofValues[p]?.trim()) return false;
      }
    }
    return true;
  }, [isFull, user, task.requiredProofs, proofValues, proofFiles]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || isFull || !canSubmit) return;
      setProgress(0);
      const duration = 3000 + Math.random() * 2000;
      const start = Date.now();
      const intervalId = setInterval(() => {
        setProgress((prev) => Math.min(100, Math.max(prev, ((Date.now() - start) / duration) * 100)));
      }, 80);

      try {
        const proofUrls: string[] = [];
        for (const p of task.requiredProofs ?? []) {
          if (p === "screenshot" || p === "file") {
            const file = proofFiles[p];
            if (file) {
              const dataUrl = await fileToDataUrl(file);
              proofUrls.push(dataUrl);
            }
          } else {
            const v = proofValues[p]?.trim();
            if (v) proofUrls.push(v);
          }
        }
        await createSubmission.mutateAsync({
          taskId: task.id,
          workerId: user.id,
          proofUrls: proofUrls.length > 0 ? proofUrls : undefined,
          content: proofUrls.length === 0 ? proofValues.text?.trim() || proofValues.form?.trim() : undefined,
        });
        setJustSubmitted(true);
        setProofValues({});
        setProofFiles({});
        refetchSubmissions();
      } finally {
        clearInterval(intervalId);
        setProgress(100);
      }
    },
    [user, isFull, canSubmit, task.requiredProofs, proofValues, proofFiles, createSubmission, refetchSubmissions]
  );

  const showForm = !mySubmission || justSubmitted === false;
  const showSuccessState = justSubmitted && createSubmission.isSuccess;
  const showStatusCard = mySubmission && !justSubmitted;

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">{task.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
            {task.type.replace("_", " ")}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              task.status === "active" && "bg-green-500/15 text-green-700 dark:text-green-400",
              task.status === "paused" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
              task.status === "closed" && "bg-muted text-muted-foreground",
              task.status === "draft" && "bg-blue-500/15 text-blue-700 dark:text-blue-400"
            )}
          >
            {task.status}
          </span>
        </div>

        <div className="mt-4 rounded-lg bg-primary/5 p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatReward(task.reward)}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">Reward per task</p>
        </div>

        <div className="mt-3">
          <p
            className={cn(
              "text-sm font-medium",
              slotsUrgency === "neutral" && "text-muted-foreground",
              slotsUrgency === "amber" && "text-amber-700 dark:text-amber-400",
              slotsUrgency === "critical" && "text-destructive font-semibold animate-pulse",
              slotsUrgency === "full" && "text-muted-foreground"
            )}
          >
            {slotsUrgency === "full"
              ? "No slots remaining"
              : slotsUrgency === "critical"
                ? `Almost full — ${slotsLeft} slots left!`
                : slotsUrgency === "amber"
                  ? `Only ${slotsLeft} slots left!`
                  : `${slotsLeft} slots remaining`}
          </p>
        </div>

        <div className="mt-2">
          <p
            className={cn(
              "text-sm",
              task.expiresAt && new Date(task.expiresAt).getTime() <= Date.now()
                ? "text-destructive font-medium"
                : "text-muted-foreground"
            )}
          >
            {expiresIn(task.expiresAt)}
          </p>
        </div>

        <section className="mt-4">
          <h3 className="text-sm font-medium text-foreground">Description</h3>
          <div className="mt-1">
            <MarkdownContent content={task.description} />
          </div>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-medium text-foreground">Required proofs</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {(task.requiredProofs ?? []).map((p) => {
              const Icon = PROOF_ICONS[p];
              return (
                <li
                  key={p}
                  className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground"
                >
                  {Icon && <Icon className="size-3.5" />}
                  {PROOF_LABELS[p]}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Already submitted: status card */}
        {showStatusCard && mySubmission && (
          <section className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
            <h3 className="text-sm font-medium text-foreground">Your submission</h3>
            <div className="mt-2">
              {mySubmission.status === "pending" && (
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                  Under review
                </span>
              )}
              {mySubmission.status === "approved" && (
                <p className="text-sm">
                  <span className="inline-flex rounded-full bg-green-500/15 px-3 py-1 font-medium text-green-700 dark:text-green-400">
                    Approved
                  </span>
                  <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                    — you earned {formatReward(task.reward)}
                  </span>
                </p>
              )}
              {mySubmission.status === "rejected" && (
                <div>
                  <span className="inline-flex rounded-full bg-destructive/15 px-3 py-1 text-sm font-medium text-destructive">
                    Rejected
                  </span>
                  {mySubmission.reviewNote && (
                    <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {mySubmission.reviewNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Success state after submit */}
        {showSuccessState && (
          <section className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
            <div className="flex justify-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-500/20">
                <Check className="size-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
              Submission received!
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll review your work and notify you.
            </p>
            <button
              type="button"
              onClick={() => {
                setJustSubmitted(false);
                refetchSubmissions();
              }}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Submit another
            </button>
          </section>
        )}

        {/* Submission form */}
        {showForm && !showSuccessState && (
          <section className="mt-6">
            <hr className="border-border" />
            <h3 className="mt-4 text-sm font-medium text-foreground">Submit your work</h3>
            <form id="task-submit-form" onSubmit={handleSubmit} className="mt-3 space-y-4">
              {(task.requiredProofs ?? []).map((p) => {
                const Icon = PROOF_ICONS[p];
                if (p === "screenshot") {
                  return (
                    <div key={p}>
                      <Label htmlFor={`proof-${p}`} className="flex items-center gap-2 text-sm">
                        {Icon && <Icon className="size-4" />}
                        {PROOF_LABELS[p]}
                      </Label>
                      <Input
                        id={`proof-${p}`}
                        type="file"
                        accept="image/*"
                        className="mt-1.5"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setProofFiles((prev) => ({ ...prev, [p]: file ?? null }));
                        }}
                        disabled={isFull || isPending}
                      />
                    </div>
                  );
                }
                if (p === "file") {
                  return (
                    <div key={p}>
                      <Label htmlFor={`proof-${p}`} className="flex items-center gap-2 text-sm">
                        {Icon && <Icon className="size-4" />}
                        {PROOF_LABELS[p]}
                      </Label>
                      <Input
                        id={`proof-${p}`}
                        type="file"
                        className="mt-1.5"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setProofFiles((prev) => ({ ...prev, [p]: file ?? null }));
                        }}
                        disabled={isFull || isPending}
                      />
                    </div>
                  );
                }
                if (p === "url") {
                  return (
                    <div key={p}>
                      <Label htmlFor={`proof-${p}`} className="flex items-center gap-2 text-sm">
                        {Icon && <Icon className="size-4" />}
                        {PROOF_LABELS[p]}
                      </Label>
                      <Input
                        id={`proof-${p}`}
                        type="url"
                        placeholder="https://..."
                        value={proofValues[p] ?? ""}
                        onChange={(e) =>
                          setProofValues((prev) => ({ ...prev, [p]: e.target.value }))
                        }
                        disabled={isFull || isPending}
                        className="mt-1.5"
                      />
                    </div>
                  );
                }
                if (p === "text" || p === "form") {
                  return (
                    <div key={p}>
                      <Label htmlFor={`proof-${p}`} className="flex items-center gap-2 text-sm">
                        {Icon && <Icon className="size-4" />}
                        {p === "form" ? "Form response" : PROOF_LABELS[p]}
                      </Label>
                      <textarea
                        id={`proof-${p}`}
                        value={proofValues[p] ?? ""}
                        onChange={(e) =>
                          setProofValues((prev) => ({ ...prev, [p]: e.target.value }))
                        }
                        placeholder={p === "form" ? "Enter your response..." : "Enter text..."}
                        rows={3}
                        disabled={isFull || isPending}
                        className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      />
                    </div>
                  );
                }
                return null;
              })}
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
              {!isMobile && (
                <Button
                  type="submit"
                  disabled={isFull || isPending || !canSubmit}
                  className="min-h-[44px] w-full touch-manipulation"
                >
                  {isFull ? "Task full" : isPending ? "Submitting…" : "Submit"}
                </Button>
              )}
            </form>
          </section>
        )}
      </div>

      {/* Mobile: sticky submit button at bottom of sheet */}
      {isMobile && showForm && !showSuccessState && (
        <div className="sticky bottom-0 border-t border-border bg-card p-4">
          <Button
            type="submit"
            form="task-submit-form"
            disabled={isFull || isPending || !canSubmit}
            className="min-h-[44px] w-full touch-manipulation"
          >
            {isFull ? "Task full" : isPending ? "Submitting…" : "Submit"}
          </Button>
        </div>
      )}
    </div>
  );
}
