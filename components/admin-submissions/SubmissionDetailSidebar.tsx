"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

const STATUS_STYLES: Record<Submission["status"], string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-destructive/15 text-destructive",
};

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || url.startsWith("data:image");
}

function isUrlLike(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");
}

function ProofBlock({ value, index }: { value: string; index: number }) {
  const label = isImageUrl(value)
    ? "Screenshot"
    : isUrlLike(value)
      ? "URL"
      : value.length > 80
        ? "Text"
        : "Form";
  if (isImageUrl(value)) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-border bg-muted/50 transition-colors hover:bg-muted"
        >
          <img
            src={value}
            alt=""
            className="max-h-40 w-full object-contain"
          />
        </a>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open full size <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }
  if (isUrlLike(value)) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-primary break-all hover:bg-muted hover:underline"
        >
          <ExternalLink className="size-4 shrink-0" />
          {value}
        </a>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm text-foreground whitespace-pre-wrap break-words">
        {value}
      </pre>
    </div>
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
  const [rejectExpanded, setRejectExpanded] = useState(false);
  useEffect(() => {
    if (submission.status !== "pending") {
      setNote("");
      setRejectExpanded(false);
    }
  }, [submission.status]);

  const reviewMutation = reviewMutationProp;

  const task = submission.task;
  const worker = submission.worker;
  const campaignName =
    task?.campaignId != null
      ? mockCampaigns.find((c) => c.id === task.campaignId)?.name ?? task.campaignId
      : null;

  const handleApprove = () => {
    reviewMutation.mutate({ id: submission.id, action: "approve" });
  };

  const handleReject = () => {
    if (!rejectExpanded) {
      setRejectExpanded(true);
      return;
    }
    reviewMutation.mutate({
      id: submission.id,
      action: "reject",
      note: note.trim() || undefined,
    });
  };

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {/* Header: avatar, name, email, status, time */}
        <div className="flex items-start gap-3">
          <WorkerAvatar name={worker?.name ?? submission.workerId} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{worker?.name ?? submission.workerId}</p>
            {worker?.email && (
              <p className="text-sm text-muted-foreground">{worker.email}</p>
            )}
          </div>
        </div>
        <div className="mt-3">
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1.5 text-sm font-semibold capitalize",
              STATUS_STYLES[submission.status]
            )}
          >
            {submission.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Submitted {formatTime(submission.submittedAt)}
          <span className="ml-1">({relativeTime(submission.submittedAt)})</span>
        </p>

        {/* Task context card */}
        {task && (
          <section className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Task
            </h3>
            <Link
              href={`/admin/tasks/${task.id}`}
              className="mt-1 block font-medium text-primary hover:underline"
            >
              {task.title}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
                {TYPE_LABELS[task.type] ?? task.type}
              </span>
              {campaignName && (
                <span className="text-muted-foreground">{campaignName}</span>
              )}
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatReward(task.reward)}
              </span>
              <span className="text-muted-foreground">
                {task.filledSlots} / {task.totalSlots} slots
              </span>
            </div>
          </section>
        )}

        {/* Proof review section */}
        <section className="mt-4">
          <h3 className="text-sm font-medium text-foreground">Proof</h3>
          <div className="mt-2 space-y-4">
            {!submission.proofUrls?.length ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
                No proofs submitted
              </p>
            ) : (
              submission.proofUrls.map((url, i) => (
                <ProofBlock key={i} value={url} index={i} />
              ))
            )}
          </div>
        </section>

        {/* Review action (pending only) */}
        {submission.status === "pending" && (
          <section className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Review</h3>
            {rejectExpanded && (
              <div className="space-y-2">
                <Label htmlFor="review-note" className="text-sm">
                  Add rejection reason (optional)
                </Label>
                <textarea
                  id="review-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                  disabled={reviewMutation.isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              </div>
            )}
            {reviewMutation.isError && (
              <p className="text-sm text-destructive">
                {reviewMutation.error?.message ?? "Review failed."}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {reviewMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Approve"
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleReject}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : rejectExpanded ? (
                  "Confirm rejection"
                ) : (
                  "Reject"
                )}
              </Button>
            </div>
          </section>
        )}

        {/* Review info (already reviewed) */}
        {submission.status !== "pending" && (
          <section className="mt-6">
            <h3 className="text-sm font-medium text-foreground">Review</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reviewed {relativeTime(submission.reviewedAt)}
            </p>
            {submission.status === "rejected" && submission.reviewNote && (
              <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-sm text-foreground">{submission.reviewNote}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
