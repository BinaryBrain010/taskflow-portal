"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { Submission } from "@/lib/types";
import type { SubmissionFilters, CreateSubmissionDTO } from "@/lib/types";
import {
  getSubmissions,
  getSubmissionById,
  getSubmissionsByTaskId,
  createSubmission,
  reviewSubmission,
} from "@/lib/services/submissionService";
import { taskKeys } from "./useTasks";

export const submissionKeys = {
  all: ["submissions"] as const,
  lists: () => [...submissionKeys.all, "list"] as const,
  list: (filters?: SubmissionFilters) => [...submissionKeys.lists(), filters] as const,
  details: () => [...submissionKeys.all, "detail"] as const,
  detail: (id: string) => [...submissionKeys.details(), id] as const,
  byTask: (taskId: string) => [...submissionKeys.all, "task", taskId] as const,
};

/** Query: fetch submissions with optional filters. 1–3s delay. */
export function useSubmissionsQuery(
  filters?: SubmissionFilters,
  options?: Omit<
    UseQueryOptions<Submission[], Error, Submission[], ReturnType<typeof submissionKeys.list>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: submissionKeys.list(filters),
    queryFn: () => getSubmissions(filters),
    ...options,
  });
}

/** Query: fetch a single submission by id. */
export function useSubmissionQuery(
  id: string | null | undefined,
  options?: Omit<
    UseQueryOptions<Submission | null, Error, Submission | null, ReturnType<typeof submissionKeys.detail>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: submissionKeys.detail(id ?? ""),
    queryFn: () => (id ? getSubmissionById(id) : Promise.resolve(null)),
    enabled: !!id,
    ...options,
  });
}

/** Query: fetch submissions for a task. */
export function useSubmissionsByTaskQuery(
  taskId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<Submission[], Error, Submission[], ReturnType<typeof submissionKeys.byTask>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: submissionKeys.byTask(taskId ?? ""),
    queryFn: () => (taskId ? getSubmissionsByTaskId(taskId) : Promise.resolve([])),
    enabled: !!taskId,
    ...options,
  });
}

/** Mutation: create a submission. 3–5s delay. */
export function useCreateSubmission(
  options?: UseMutationOptions<Submission, Error, CreateSubmissionDTO>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubmission,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: submissionKeys.byTask(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
}

/** Mutation: review a submission (approve or reject). 3–5s delay. */
export function useReviewSubmission(
  options?: UseMutationOptions<
    Submission,
    Error,
    { id: string; action: "approve" | "reject"; note?: string }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }) => reviewSubmission(id, action, note),
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: submissionKeys.byTask(data.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
}
