"use client";

import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type { Submission } from "@/lib/types";
import { createSubmission, type CreateSubmissionDTO } from "@/lib/services/submissionService";
import { taskKeys } from "./useTasks";

export function useCreateSubmission(
  options?: UseMutationOptions<Submission, Error, CreateSubmissionDTO>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubmission,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
}
