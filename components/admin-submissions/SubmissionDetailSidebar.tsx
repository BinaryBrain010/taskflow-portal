"use client";

import { useState, useEffect } from "react";
import { ExternalLink, ImageIcon, Loader2 } from "lucide-react";
import type { Submission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mockCampaigns } from "@/lib/mock/mockCampaigns";
import { cn } from "@/lib/utils";

type ReviewMutation = {
  mutate: (args: { id: string; action: "approve" | "reject"; note?: string }) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const TYPE_LABELS: Record<string, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || url.startsWith("data:image");
}

function ProofPreview({ url }: { url: string }) {
  if (isImageUrl(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 rounded-lg border border-border bg-muted/50 p-2 transition-colors hover:bg-muted"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
          <ImageIcon className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded border border-border bg-muted">
            <img src={url} alt="Proof" className="max-h-40 w-full object-contain" />
          </div>
          <span className="mt-1 block truncate break-all text-xs text-primary">{url}</span>
        </div>
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-primary break-all hover:bg-muted hover:underline"
    >
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
      {url}
    </a>
  );
}

function WorkerAvatar({ name, className }: { name: string; className?: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary",
        className
      )}
    >
      {initial}
    </div>
  );
}

interface SubmissionDetailSidebarProps {
  submission: Submission;
  onClose?: () => void;
  onReviewed?: (submission: Submission) => void;
  reviewMutation: ReviewMutation;
  className?: string;
}

export function SubmissionDetailSidebar({
  submission,
  onClose,
  onReviewed,
  reviewMutation: reviewMutationProp,
  className,
}: SubmissionDetailSidebarProps) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (submission.status !== "pending") setNote("");
  }, [submission.status]);

  const reviewMutation = reviewMutationProp;

  const task = submission.task;
  const worker = submission.worker;
  const campaignName =
    task?.campaignId != null
      ? mockCampaigns.find((c) => c.id === task.campaignId)?.name ?? task.campaignId
      : null;

  const handleReview = (action: "approve" | "reject") => {
    reviewMutation.mutate({
      id: submission.id,
      action,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Submission details</h2>

        {/* Proof previews */}
        <section className="mt-4">
          <h3 className="text-sm font-medium text-foreground">Proof</h3>
          <div className="mt-2 space-y-2">
            {submission.proofUrls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No proof URLs.</p>
            ) : (
              submission.proofUrls.map((url, i) => (
                <ProofPreview key={i} url={url} />
              ))
            )}
          </div>
        </section>

        {/* Task context */}
        {task && (
          <section className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
            <h3 className="text-sm font-medium text-foreground">Task</h3>
            <p className="mt-1 font-medium text-foreground">{task.title}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{TYPE_LABELS[task.type] ?? task.type}</span>
              <span>{formatReward(task.reward)}</span>
              {campaignName && <span>{campaignName}</span>}
            </div>
          </section>
        )}

        {/* Worker snippet */}
        {worker && (
          <section className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <WorkerAvatar name={worker.name} className="size-10" />
            <div>
              <p className="font-medium text-foreground">{worker.name}</p>
              <p className="text-xs text-muted-foreground">{worker.email}</p>
            </div>
          </section>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          Submitted {formatTime(submission.submittedAt)}
          {submission.reviewedAt && (
            <> · Reviewed {formatTime(submission.reviewedAt)}</>
          )}
        </p>
        {submission.reviewNote && (
          <p className="mt-1 text-sm text-muted-foreground">Note: {submission.reviewNote}</p>
        )}

        {/* Review actions */}
        {submission.status === "pending" && (
          <section className="mt-6 space-y-3">
            <Label htmlFor="review-note">Review note (optional)</Label>
            <textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the worker..."
              rows={3}
              disabled={reviewMutation.isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            {reviewMutation.isError && (
              <p className="text-sm text-destructive">
                {reviewMutation.error?.message ?? "Review failed."}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => handleReview("approve")}
                disabled={reviewMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {reviewMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Approve"
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview("reject")}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Reject"
                )}
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
