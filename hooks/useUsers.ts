"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { User, UserStatus } from "@/lib/types";
import type { UserFilters, CreateUserDTO } from "@/lib/services/userService";
import {
  getUsers,
  getUserById,
  createUser,
  updateUserStatus,
  bulkUpdateUserStatus,
  deleteUser,
  bulkDeleteUsers,
} from "@/lib/services/userService";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters?: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsersQuery(
  filters?: UserFilters,
  options?: Omit<
    UseQueryOptions<User[], Error, User[], ReturnType<typeof userKeys.list>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => getUsers(filters),
    ...options,
  });
}

export function useUserQuery(
  id: string | null | undefined,
  options?: Omit<
    UseQueryOptions<User | null, Error, User | null, ReturnType<typeof userKeys.detail>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => (id ? getUserById(id) : Promise.resolve(null)),
    enabled: !!id,
    ...options,
  });
}

export function useUpdateUserStatus(
  options?: UseMutationOptions<User, Error, { id: string; status: UserStatus }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => updateUserStatus(id, status),
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
}

export function useBulkUpdateUserStatus(
  options?: UseMutationOptions<User[], Error, { ids: string[]; status: UserStatus }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }) => bulkUpdateUserStatus(ids, status),
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      data.forEach((u) => queryClient.invalidateQueries({ queryKey: userKeys.detail(u.id) }));
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
}

export function useCreateUser(
  options?: UseMutationOptions<User, Error, CreateUserDTO>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
}

export function useDeleteUser(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      options?.onSuccess?.(undefined, id, undefined as never, undefined as never);
    },
    ...options,
  });
}

export function useBulkDeleteUsers(
  options?: UseMutationOptions<void, Error, string[]>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkDeleteUsers,
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      ids.forEach((id) => queryClient.removeQueries({ queryKey: userKeys.detail(id) }));
      options?.onSuccess?.(undefined, ids, undefined as never, undefined as never);
    },
    ...options,
  });
}
