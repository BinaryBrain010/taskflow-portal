"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { Submission } from "@/lib/types";
import {
  createSubmission,
  getSubmissionsByTaskId,
  type CreateSubmissionDTO,
} from "@/lib/services/submissionService";
import { taskKeys } from "./useTasks";

const submissionKeys = {
  byTask: (taskId: string) => ["submissions", "task", taskId] as const,
};

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

export function useCreateSubmission(
  options?: UseMutationOptions<Submission, Error, CreateSubmissionDTO>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubmission,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: submissionKeys.byTask(variables.taskId) });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
}
