"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQueryStates, parseAsStringLiteral, parseAsString } from "nuqs";
import {
  Search,
  X,
  MoreVertical,
  Eye,
  UserX,
  UserCheck,
  Trash2,
  Users,
  UserPlus,
} from "lucide-react";
import type { User, UserStatus } from "@/lib/types";
import { useUsersQuery, useCreateUser, useUpdateUserStatus, useBulkUpdateUserStatus, useDeleteUser, useBulkDeleteUsers } from "@/hooks/useUsers";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import {
  SheetRoot,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import {
  ConfirmDialogRoot,
  ConfirmDialogContent,
} from "@/components/ui/confirm-dialog";
import { UserDetailSidebar } from "@/components/admin-users/UserDetailSidebar";
import { InviteUserModal } from "@/components/admin-users/InviteUserModal";
import { cn } from "@/lib/utils";

const ROLE_TABS = [
  { value: "all" as const, label: "All" },
  { value: "worker" as const, label: "Workers" },
  { value: "admin" as const, label: "Admins" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most_submissions", label: "Most submissions" },
  { value: "most_earned", label: "Most earned" },
];

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/30",
  worker: "bg-muted text-muted-foreground border-border",
};
const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  suspended: "bg-destructive/15 text-destructive",
};

const parsers = {
  role: parseAsStringLiteral(["all", "worker", "admin"] as const).withDefault("all"),
  status: parseAsStringLiteral(["all", "active", "suspended"] as const).withDefault("all"),
  sort: parseAsStringLiteral(["newest", "oldest", "most_submissions", "most_earned"] as const).withDefault("newest"),
  search: parseAsString.withDefault(""),
};

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function UserAvatar({ user, size = 32 }: { user: User; size?: number }) {
  const src = user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.id)}`;
  return (
    <img
      src={src}
      alt=""
      className="rounded-full border border-border object-cover"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-0 rounded-xl border border-border bg-card">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
        >
          <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ isSearch }: { isSearch: boolean }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-border bg-card px-4 py-12 text-center">
      <div className="rounded-full bg-muted/50 p-4">
        <Users className="size-10 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
        {isSearch ? "No users match your search" : "No users found"}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {isSearch ? "Try a different search term." : "Users will appear here."}
      </p>
    </div>
  );
}

export default function AdminUsersPage() {
  const [params, setParams] = useQueryStates(parsers);
  const [selected, setSelected] = useState<User | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [bulkSuspendConfirmOpen, setBulkSuspendConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const isMobile = useIsMobile();

  const filters = useMemo(
    () => ({
      role: params.role === "all" ? undefined : params.role,
      status: params.status === "all" ? undefined : (params.status as UserStatus),
      search: params.search?.trim() || undefined,
      sort: params.sort,
    }),
    [params.role, params.status, params.sort, params.search]
  );

  const { data: users = [], isLoading, error } = useUsersQuery(filters);
  const { data: allUsers = [] } = useUsersQuery();
  const createUserMutation = useCreateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const bulkUpdateStatusMutation = useBulkUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();
  const bulkDeleteMutation = useBulkDeleteUsers();

  const counts = useMemo(() => {
    const all = users.length;
    const workers = users.filter((u) => u.role === "worker").length;
    const admins = users.filter((u) => u.role === "admin").length;
    return { all, workers, admins };
  }, [users]);

  const selectedIds = useMemo(
    () => Object.entries(rowSelection).filter(([, v]) => v).map(([id]) => id),
    [rowSelection]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSuspendClick = useCallback((user: User) => {
    setSuspendTarget(user);
    setSuspendConfirmOpen(true);
  }, []);

  const handleSuspendConfirm = useCallback(() => {
    if (!suspendTarget) return;
    const name = suspendTarget.name;
    updateStatusMutation.mutate(
      { id: suspendTarget.id, status: "suspended" },
      {
        onSuccess: () => {
          setSuspendConfirmOpen(false);
          setSuspendTarget(null);
          setSelected(null);
          setToast(`${name} has been suspended`);
        },
      }
    );
  }, [suspendTarget, updateStatusMutation]);

  const handleBulkSuspendConfirm = useCallback(() => {
    if (selectedIds.length === 0) return;
    bulkUpdateStatusMutation.mutate(
      { ids: selectedIds, status: "suspended" },
      {
        onSuccess: () => {
          setBulkSuspendConfirmOpen(false);
          setRowSelection({});
        },
      }
    );
  }, [selectedIds, bulkUpdateStatusMutation]);

  const handleDeleteClick = useCallback((user: User) => {
    setDeleteTarget(user);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteUserMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        setSelected(null);
      },
    });
  }, [deleteTarget, deleteUserMutation]);

  const handleBulkDeleteConfirm = useCallback(() => {
    if (selectedIds.length === 0) return;
    bulkDeleteMutation.mutate(selectedIds, {
      onSuccess: () => {
        setBulkDeleteConfirmOpen(false);
        setRowSelection({});
      },
    });
  }, [selectedIds, bulkDeleteMutation]);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el)
                el.indeterminate =
                  table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
            }}
            onChange={(e) => table.toggleAllPageRowsSelected((e.target as HTMLInputElement).checked)}
            aria-label="Select all"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected((e.target as HTMLInputElement).checked)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
      },
      {
        id: "user",
        header: () => <span className="text-muted-foreground">User</span>,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2">
              <UserAvatar user={u} size={32} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "role",
        header: () => <span className="text-muted-foreground">Role</span>,
        cell: ({ row }) => {
          const role = row.original.role;
          return (
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                ROLE_STYLES[role] ?? "bg-muted"
              )}
            >
              {role === "admin" ? "Admin" : "Worker"}
            </span>
          );
        },
      },
      {
        id: "status",
        header: () => <span className="text-muted-foreground">Status</span>,
        cell: ({ row }) => {
          const status = row.original.status ?? "active";
          return (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                STATUS_STYLES[status]
              )}
            >
              {status}
            </span>
          );
        },
      },
      {
        id: "submissions",
        header: () => <span className="text-muted-foreground">Submissions</span>,
        cell: ({ row }) => {
          const u = row.original;
          if (u.role === "admin") return <span className="text-muted-foreground">—</span>;
          return <span className="text-foreground">{u.totalSubmissions ?? 0}</span>;
        },
      },
      {
        id: "earned",
        header: () => <span className="text-muted-foreground">Total earned</span>,
        cell: ({ row }) => {
          const u = row.original;
          if (u.role === "admin") return <span className="text-muted-foreground">—</span>;
          return (
            <span className="font-medium text-foreground">
              {formatDollars(u.totalEarned ?? 0)}
            </span>
          );
        },
      },
      {
        id: "joined",
        header: () => <span className="text-muted-foreground">Joined</span>,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatRelative(row.original.joinedAt ?? row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "lastActive",
        header: () => <span className="text-muted-foreground">Last active</span>,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatRelative(row.original.lastActiveAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => {
          const u = row.original;
          const isOpen = openMenuId === u.id;
          return (
            <div className="relative" ref={isOpen ? menuRef : undefined} onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => setOpenMenuId(isOpen ? null : u.id)}
                aria-label="Actions"
                aria-expanded={isOpen}
              >
                <MoreVertical className="size-4" />
              </Button>
              {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-background py-1 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSelected(u);
                      setOpenMenuId(null);
                    }}
                  >
                    <Eye className="size-4" />
                    View details
                  </button>
                  {u.status === "active" ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-900/50"
                      onClick={() => {
                        setSuspendTarget(u);
                        setSuspendConfirmOpen(true);
                        setOpenMenuId(null);
                      }}
                    >
                      <UserX className="size-4" />
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: u.id, status: "active" });
                        setOpenMenuId(null);
                      }}
                    >
                      <UserCheck className="size-4" />
                      Activate
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setDeleteTarget(u);
                      setDeleteConfirmOpen(true);
                      setOpenMenuId(null);
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        },
        size: 48,
      },
    ],
    [openMenuId, updateStatusMutation]
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const detailOpen = !!selected;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-2">
      {/* Header: title + search + Invite */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Users
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative w-40 min-w-[180px] transition-[width] duration-200 focus-within:w-56">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={params.search}
              onChange={(e) => setParams({ ...params, search: e.target.value })}
              placeholder="Search by name or email…"
              aria-label="Search users"
              className="h-9 pl-8 pr-8 text-sm"
            />
            {params.search && (
              <button
                type="button"
                onClick={() => setParams({ ...params, search: "" })}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary/10"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="size-4" />
            Invite user
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="User type">
        {ROLE_TABS.map(({ value, label }) => {
          const count =
            value === "all" ? counts.all : value === "worker" ? counts.workers : counts.admins;
          const isSelected = params.role === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setParams({ role: value })}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span>{label}</span>
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
                  isSelected ? "bg-primary-foreground/25" : "bg-muted"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </span>
        <SelectDropdown.Root
          value={params.status}
          onValueChange={(v) => setParams({ status: v as typeof params.status })}
          options={STATUS_OPTIONS}
          placeholder="All"
        >
          <SelectDropdown.Trigger className="h-8 min-w-[100px] rounded border border-input px-2 text-xs" />
          <SelectDropdown.Content />
        </SelectDropdown.Root>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Sort
        </span>
        <SelectDropdown.Root
          value={params.sort}
          onValueChange={(v) => setParams({ sort: v as typeof params.sort })}
          options={SORT_OPTIONS}
          placeholder="Sort"
        >
          <SelectDropdown.Trigger className="h-8 min-w-[120px] rounded border border-input px-2 text-xs" />
          <SelectDropdown.Content />
        </SelectDropdown.Root>
      </div>

      {/* Bulk bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-background px-4 py-2 shadow-lg">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} user{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkSuspendConfirmOpen(true)}
            disabled={bulkUpdateStatusMutation.isPending}
          >
            Suspend selected
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteConfirmOpen(true)}
            disabled={bulkDeleteMutation.isPending}
          >
            Delete selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            Clear
          </Button>
        </div>
      )}

      {isLoading && <TableSkeleton />}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message ?? "Failed to load users."}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="flex min-h-0 flex-1 gap-0">
          <div className="min-w-0 flex-1">
            {users.length === 0 ? (
              <EmptyState isSearch={!!params.search?.trim()} />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b border-border bg-muted/40">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                            style={{ width: header.getSize() }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setSelected(row.original)}
                        className={cn(
                          "cursor-pointer border-b border-border/80 transition-colors hover:bg-muted/40",
                          row.getIsSelected() && "bg-primary/5",
                          selected?.id === row.original.id && "bg-primary/5"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-3 text-sm"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!isMobile && detailOpen && selected && (
            <aside className="hidden w-full max-w-[min(24rem,90vw)] shrink-0 border-l border-border bg-card md:block">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h2 className="font-display text-base font-semibold text-foreground">User details</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <UserDetailSidebar
                    user={selected}
                    onClose={() => setSelected(null)}
                    onSuspendClick={handleSuspendClick}
                    statusMutation={{
                      mutate: updateStatusMutation.mutate,
                      isPending: updateStatusMutation.isPending,
                    }}
                  />
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {isMobile && (
        <SheetRoot open={detailOpen} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent side="bottom" showCloseButton className="max-h-[85vh] flex flex-col p-0">
            <SheetHeader className="shrink-0 border-b border-border px-3 py-2">
              <SheetTitle>User details</SheetTitle>
            </SheetHeader>
            <SheetBody className="min-h-0 flex-1 overflow-auto">
              {selected && (
                <UserDetailSidebar
                  user={selected}
                  onClose={() => setSelected(null)}
                  onSuspendClick={handleSuspendClick}
                  statusMutation={{
                    mutate: updateStatusMutation.mutate,
                    isPending: updateStatusMutation.isPending,
                  }}
                />
              )}
            </SheetBody>
          </SheetContent>
        </SheetRoot>
      )}

      {/* Suspend single confirm */}
      <ConfirmDialogRoot open={suspendConfirmOpen} onOpenChange={setSuspendConfirmOpen}>
        <ConfirmDialogContent
          title={suspendTarget ? `Suspend ${suspendTarget.name}?` : "Suspend user?"}
          description={
            suspendTarget
              ? `${suspendTarget.name} will be suspended and won’t be able to submit tasks.`
              : undefined
          }
          confirmLabel="Suspend user"
          variant="destructive"
          onConfirm={handleSuspendConfirm}
          onCancel={() => {
            setSuspendConfirmOpen(false);
            setSuspendTarget(null);
          }}
          loading={updateStatusMutation.isPending}
        />
      </ConfirmDialogRoot>

      {/* Bulk suspend confirm */}
      <ConfirmDialogRoot open={bulkSuspendConfirmOpen} onOpenChange={setBulkSuspendConfirmOpen}>
        <ConfirmDialogContent
          title="Suspend selected users?"
          description={`${selectedIds.length} user(s) will be suspended.`}
          confirmLabel="Suspend"
          variant="destructive"
          onConfirm={handleBulkSuspendConfirm}
          onCancel={() => setBulkSuspendConfirmOpen(false)}
          loading={bulkUpdateStatusMutation.isPending}
        />
      </ConfirmDialogRoot>

      {/* Delete single confirm */}
      <ConfirmDialogRoot open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <ConfirmDialogContent
          title={deleteTarget ? `Delete ${deleteTarget.name}?` : "Delete user?"}
          description="This will permanently delete this account and all associated data. This action cannot be undone."
          confirmLabel="Delete user"
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
          }}
          loading={deleteUserMutation.isPending}
        />
      </ConfirmDialogRoot>

      {/* Bulk delete confirm */}
      <ConfirmDialogRoot open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <ConfirmDialogContent
          title="Delete selected users?"
          description={`${selectedIds.length} user(s) will be permanently removed.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setBulkDeleteConfirmOpen(false)}
          loading={bulkDeleteMutation.isPending}
        />
      </ConfirmDialogRoot>

      <InviteUserModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        existingUsers={allUsers}
        onSubmit={async (data) => {
          await createUserMutation.mutateAsync(data);
        }}
        onSuccess={(email) => setToast(`Invitation sent to ${email}`)}
        isSubmitting={createUserMutation.isPending}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
