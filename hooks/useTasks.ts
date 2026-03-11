"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { Task, TaskFilters, CreateTaskDTO } from "@/lib/types";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTasks,
  bulkUpdateTasks,
} from "@/lib/services/taskService";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

/** Query: fetch tasks with optional filters. 1–3s delay. */
export function useTasksQuery(
  filters?: TaskFilters,
  options?: Omit<
    UseQueryOptions<Task[], Error, Task[], ReturnType<typeof taskKeys.list>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => getTasks(filters),
    ...options,
  });
}

/** Query: fetch a single task by id. */
export function useTaskQuery(
  id: string | null | undefined,
  options?: Omit<
    UseQueryOptions<Task | null, Error, Task | null, ReturnType<typeof taskKeys.detail>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ""),
    queryFn: () => (id ? getTaskById(id) : Promise.resolve(null)),
    enabled: !!id,
    ...options,
  });
}

/** Mutation: create a task. 3–5s delay. Invalidates task lists. */
export function useCreateTask(
  options?: UseMutationOptions<Task, Error, CreateTaskDTO>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      options?.onSuccess?.(_data, _variables, context);
    },
    ...options,
  });
}

/** Mutation: update a task. 3–5s delay. Invalidates list and detail. */
export function useUpdateTask(
  options?: UseMutationOptions<Task, Error, { id: string; data: Partial<Task> }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateTask(id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/** Mutation: delete tasks by ids. Invalidates task lists and details. */
export function useDeleteTasks(
  options?: UseMutationOptions<void, Error, string[]>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTasks,
    onSuccess: (_data, ids, context) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      ids.forEach((id) =>
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      );
      options?.onSuccess?.(_data, ids, context);
    },
    ...options,
  });
}

/** Mutation: bulk update reward and/or campaignId. 3–5s delay. */
export function useBulkUpdateTasks(
  options?: UseMutationOptions<
    Task[],
    Error,
    { ids: string[]; data: Pick<Task, "reward" | "campaignId"> }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, data }) => bulkUpdateTasks(ids, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      data.forEach((task) =>
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) })
      );
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
