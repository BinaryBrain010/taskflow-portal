"use client";

import { useMemo, useState, useCallback } from "react";
import { useTasksQuery } from "@/hooks/useTasks";
import { useSubmissionsQuery, useReviewSubmission } from "@/hooks/useSubmissions";
import { useIsMobile } from "@/hooks/useIsMobile";
import { StatsCards } from "@/features/dashboard/StatsCards";
import { RecentTasks } from "@/features/dashboard/RecentTasks";
import { SubmissionFunnel } from "@/features/dashboard/SubmissionFunnel";
import { TaskTypeBreakdown } from "@/features/dashboard/TaskTypeBreakdown";
import { RecentSubmissionsTable } from "@/features/dashboard/RecentSubmissionsTable";
import { SubmissionDetailSidebar } from "@/components/admin-submissions/SubmissionDetailSidebar";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Submission } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { submissionKeys } from "@/hooks/useSubmissions";

export default function AdminDashboardPage() {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: isLoadingTasks } = useTasksQuery();
  const { data: submissions = [], isLoading: isLoadingSubmissions } = useSubmissionsQuery();

  const recentTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copy;
  }, [tasks]);

  const recentSubmissions = useMemo(() => {
    const copy = [...submissions];
    copy.sort((a, b) => {
      const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return tb - ta;
    });
    return copy;
  }, [submissions]);

  const handleReviewed = useCallback((submission: Submission) => {
    setSelectedSubmission((prev) => (prev?.id === submission.id ? submission : prev));
  }, []);

  const reviewMutation = useReviewSubmission({
    onSuccess: handleReviewed,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });

  const detailOpen = !!selectedSubmission;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of tasks and submissions.
        </p>
      </div>

      {/* Stats row */}
      <StatsCards
        tasks={tasks}
        submissions={submissions}
        isLoadingTasks={isLoadingTasks}
        isLoadingSubmissions={isLoadingSubmissions}
      />

      {/* Middle row: equal-height cards */}
      <div className="grid gap-6 lg:grid-cols-20 lg:items-stretch">
        <div className="h-full min-h-0 lg:col-span-8">
          <RecentTasks tasks={recentTasks} isLoading={isLoadingTasks} />
        </div>
        <div className="h-full min-h-0 lg:col-span-7">
          <SubmissionFunnel
            submissions={submissions}
            isLoading={isLoadingSubmissions}
          />
        </div>
        <div className="h-full min-h-0 lg:col-span-5">
          <TaskTypeBreakdown tasks={tasks} isLoading={isLoadingTasks} />
        </div>
      </div>

      {/* Bottom: Recent submissions table */}
      <div className="flex flex-col gap-0 lg:flex-row">
        <div className="min-w-0 flex-1">
          <RecentSubmissionsTable
            submissions={recentSubmissions}
            isLoading={isLoadingSubmissions}
            selectedId={selectedSubmission?.id ?? null}
            onSelect={setSelectedSubmission}
          />
        </div>

        {/* Desktop: submission detail sidebar */}
        {!isMobile && detailOpen && selectedSubmission && (
          <aside className="hidden w-full max-w-[min(24rem,90vw)] shrink-0 border-l border-border bg-card lg:block">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Submission
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedSubmission(null)}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <SubmissionDetailSidebar
                  submission={selectedSubmission}
                  onClose={() => setSelectedSubmission(null)}
                  onReviewed={handleReviewed}
                  reviewMutation={{
                    mutate: reviewMutation.mutate,
                    isPending: reviewMutation.isPending,
                    isError: reviewMutation.isError,
                    error: reviewMutation.error,
                  }}
                />
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile: submission detail sheet */}
      {isMobile && (
        <SheetRoot
          open={detailOpen}
          onOpenChange={(open) => !open && setSelectedSubmission(null)}
        >
          <SheetContent side="bottom" showCloseButton className="max-h-[85vh] flex flex-col p-0">
            <SheetHeader className="shrink-0 border-b border-border p-4">
              <SheetTitle>Submission</SheetTitle>
            </SheetHeader>
            <SheetBody className="min-h-0 flex-1 overflow-auto">
              {selectedSubmission && (
                <SubmissionDetailSidebar
                  submission={selectedSubmission}
                  onClose={() => setSelectedSubmission(null)}
                  onReviewed={handleReviewed}
                  reviewMutation={{
                    mutate: reviewMutation.mutate,
                    isPending: reviewMutation.isPending,
                    isError: reviewMutation.isError,
                    error: reviewMutation.error,
                  }}
                />
              )}
            </SheetBody>
          </SheetContent>
        </SheetRoot>
      )}
    </div>
  );
}
