"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useQueryStates, parseAsStringLiteral, parseAsString, parseAsInteger } from "nuqs";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  ListChecks,
} from "lucide-react";
import type { Task, TaskType, TaskStatus } from "@/lib/types";
import { useTasksQuery, useDeleteTasks, useBulkUpdateTasks } from "@/hooks/useTasks";
import { mockCampaigns } from "@/lib/mock/mockCampaigns";
import { TaskRowExpansion } from "@/components/admin-tasks/TaskRowExpansion";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import {
  ConfirmDialogRoot,
  ConfirmDialogContent,
} from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const TASK_TYPES: { value: TaskType }[] = [
  { value: "survey" },
  { value: "content_review" },
  { value: "data_labeling" },
  { value: "transcription" },
];

const TASK_STATUSES: { value: TaskStatus }[] = [
  { value: "draft" },
  { value: "active" },
  { value: "paused" },
  { value: "closed" },
];

const TYPE_LABELS: Record<TaskType, string> = {
  survey: "Survey",
  content_review: "Content Review",
  data_labeling: "Data Labeling",
  transcription: "Transcription",
};

const TYPE_BADGE_STYLES: Record<TaskType, string> = {
  survey: "border border-indigo-300 bg-indigo-500/15 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-900/50 dark:text-indigo-200",
  content_review: "border border-violet-300 bg-violet-500/15 text-violet-700 dark:border-violet-500/40 dark:bg-violet-900/50 dark:text-violet-200",
  data_labeling: "border border-orange-300 bg-orange-500/15 text-orange-700 dark:border-orange-500/40 dark:bg-orange-900/50 dark:text-orange-200",
  transcription: "border border-cyan-300 bg-cyan-500/15 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-900/50 dark:text-cyan-200",
};

const STATUS_BADGE_STYLES: Record<TaskStatus, string> = {
  active: "bg-green-500/15 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  paused: "bg-amber-500/15 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  closed: "bg-muted text-muted-foreground",
  draft: "bg-blue-500/15 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
};

function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EmptyCell() {
  return <span className="italic text-muted-foreground">—</span>;
}

function getCampaignName(id: string | null): string {
  if (!id) return "";
  return mockCampaigns.find((c) => c.id === id)?.name ?? id;
}

const FILTER_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  ...TASK_TYPES.map((t) => ({ value: t.value, label: TYPE_LABELS[t.value] })),
];

const FILTER_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  ...TASK_STATUSES.map((t) => ({ value: t.value, label: t.value.charAt(0).toUpperCase() + t.value.slice(1) })),
];

const FILTER_CAMPAIGN_OPTIONS = [
  { value: "", label: "All" },
  ...mockCampaigns.map((c) => ({ value: c.id, label: c.name })),
];

const taskFiltersParsers = {
  type: parseAsStringLiteral([
    "all",
    "survey",
    "content_review",
    "data_labeling",
    "transcription",
  ] as const).withDefault("all"),
  status: parseAsStringLiteral([
    "all",
    "draft",
    "active",
    "paused",
    "closed",
  ] as const).withDefault("all"),
  campaignId: parseAsString.withDefault(""),
  expiresFrom: parseAsString.withDefault(""),
  expiresTo: parseAsString.withDefault(""),
  sortId: parseAsString.withDefault("createdAt"),
  sortDir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
};

const PAGE_SIZES = [10, 25, 50, 100];

export default function AdminTasksPage() {
  const [params, setParams] = useQueryStates(taskFiltersParsers);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean> | true>({});
  const sorting: SortingState = useMemo(
    () => [{ id: params.sortId, desc: params.sortDir === "desc" }],
    [params.sortId, params.sortDir]
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [bulkRewardOpen, setBulkRewardOpen] = useState(false);
  const [bulkCampaignOpen, setBulkCampaignOpen] = useState(false);
  const [bulkRewardValue, setBulkRewardValue] = useState("");
  const [bulkCampaignId, setBulkCampaignId] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      type: params.type === "all" ? undefined : params.type,
      status: params.status === "all" ? undefined : params.status,
      campaignId: params.campaignId || undefined,
      expiresFrom: params.expiresFrom || undefined,
      expiresTo: params.expiresTo || undefined,
    }),
    [params.type, params.status, params.campaignId, params.expiresFrom, params.expiresTo]
  );

  const { data: tasks = [], isLoading, error } = useTasksQuery(filters);
  const deleteTasksMutation = useDeleteTasks();
  const bulkUpdateMutation = useBulkUpdateTasks();

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    const col = params.sortId;
    const desc = params.sortDir === "desc";
    copy.sort((a, b) => {
      let aVal: string | number | null = (a as unknown as Record<string, unknown>)[col] as string | number | null;
      let bVal: string | number | null = (b as unknown as Record<string, unknown>)[col] as string | number | null;
      if (col === "slotsLeft") {
        aVal = a.totalSlots - a.filledSlots;
        bVal = b.totalSlots - b.filledSlots;
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return desc ? -1 : 1;
      if (bVal == null) return desc ? 1 : -1;
      if (typeof aVal === "number" && typeof bVal === "number")
        return desc ? bVal - aVal : aVal - bVal;
      const aStr = String(aVal);
      const bStr = String(bVal);
      return desc ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
    });
    return copy;
  }, [tasks, params.sortId, params.sortDir]);

  const paginatedTasks = useMemo(() => {
    const start = (params.page - 1) * params.pageSize;
    return sortedTasks.slice(start, start + params.pageSize);
  }, [sortedTasks, params.page, params.pageSize]);

  const selectedIds = useMemo(
    () => Object.entries(rowSelection).filter(([, v]) => v).map(([id]) => id),
    [rowSelection]
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const setSort = useCallback(
    (id: string, desc: boolean) => {
      setParams({ sortId: id, sortDir: desc ? "desc" : "asc", page: 1 });
    },
    [setParams]
  );

  const columns = useMemo<ColumnDef<Task>[]>(
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
        id: "expand",
        header: () => null,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="p-1 rounded hover:bg-muted"
            aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        ),
        size: 36,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortHeader column={column} label="Title" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground line-clamp-1">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <SortHeader column={column} label="Type" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ getValue }) => {
          const type = getValue() as TaskType;
          return (
            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", TYPE_BADGE_STYLES[type])}>
              {TYPE_LABELS[type]}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <SortHeader column={column} label="Status" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ getValue }) => {
          const status = getValue() as TaskStatus | undefined;
          if (status == null) return <EmptyCell />;
          return (
            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_BADGE_STYLES[status])}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "reward",
        header: ({ column }) => (
          <SortHeader column={column} label="Reward" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ getValue }) => (
          <span className="font-medium text-green-700 dark:text-green-400">{formatReward((getValue() as number) ?? 0)}</span>
        ),
      },
      {
        accessorKey: "totalSlots",
        header: ({ column }) => (
          <SortHeader column={column} label="Total slots" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ getValue }) => <span className="text-foreground">{getValue() as number}</span>,
      },
      {
        accessorKey: "filledSlots",
        header: ({ column }) => (
          <SortHeader column={column} label="Filled" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ getValue }) => <span className="text-foreground">{getValue() as number}</span>,
      },
      {
        id: "slotsLeft",
        header: ({ column }) => (
          <SortHeader column={column} label="Slots left" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ row }) => {
          const left = row.original.totalSlots - row.original.filledSlots;
          return <span className="text-foreground">{left}</span>;
        },
      },
      {
        accessorKey: "campaignId",
        header: ({ column }) => (
          <SortHeader column={column} label="Campaign" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ getValue }) => {
          const id = getValue() as string | null;
          const name = getCampaignName(id);
          if (!name) return <EmptyCell />;
          const display = name.length > 18 ? `${name.slice(0, 18)}…` : name;
          return (
            <Tooltip content={name} side="top">
              <span className="text-muted-foreground line-clamp-1 max-w-[120px] cursor-default">
                {display}
              </span>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "expiresAt",
        header: ({ column }) => (
          <SortHeader column={column} label="Expires" sorting={sorting} setSort={setSort} />
        ),
        cell: ({ getValue }) => {
          const iso = getValue() as string | null;
          if (!iso) return <EmptyCell />;
          return <span className="text-muted-foreground text-sm">{formatDate(iso)}</span>;
        },
      },
      {
        id: "actions",
        header: () => <span className="text-muted-foreground">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Tooltip content="Edit" side="top">
              <Link
                href={`/admin/tasks/${row.original.id}/edit`}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8 rounded-full hover:bg-muted")}
                aria-label="Edit"
              >
                <Pencil className="size-4" />
              </Link>
            </Tooltip>
            <Tooltip content="Delete" side="top">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setDeleteTargetIds([row.original.id]);
                  setDeleteConfirmOpen(true);
                }}
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
            </Tooltip>
            <Tooltip content="View Submissions" side="top">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-muted"
                onClick={() => row.toggleExpanded()}
                aria-label="View submissions"
              >
                <ListChecks className="size-4" />
              </Button>
            </Tooltip>
          </div>
        ),
        size: 140,
      },
    ],
    [setSort, sorting]
  );

  const table = useReactTable({
    data: paginatedTasks,
    columns,
    state: {
      rowSelection,
      expanded,
      sorting,
    },
    onRowSelectionChange: setRowSelection,
    onExpandedChange: (updater) =>
      setExpanded((prev) => (typeof updater === "function" ? updater(prev) : updater)),
    onSortingChange: () => {},
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const handleBulkDelete = () => {
    const ids = selectedIds.length ? selectedIds : deleteTargetIds;
    if (ids.length === 0) return;
    deleteTasksMutation.mutate(ids, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        setDeleteTargetIds([]);
        setRowSelection({});
        setToast(ids.length === 1 ? "Task deleted successfully" : "Tasks deleted successfully");
      },
    });
  };

  const openBulkDeleteConfirm = () => {
    setDeleteTargetIds(selectedIds);
    setDeleteConfirmOpen(true);
  };

  const handleBulkReward = () => {
    const cents = Math.round(parseFloat(bulkRewardValue) * 100);
    if (selectedIds.length === 0 || Number.isNaN(cents) || cents < 0) return;
    bulkUpdateMutation.mutate(
      { ids: selectedIds, data: { reward: cents } },
      {
        onSuccess: () => {
          setBulkRewardOpen(false);
          setBulkRewardValue("");
          setRowSelection({});
        },
      }
    );
  };

  const handleBulkCampaign = () => {
    if (selectedIds.length === 0) return;
    bulkUpdateMutation.mutate(
      { ids: selectedIds, data: { campaignId: bulkCampaignId || null } },
      {
        onSuccess: () => {
          setBulkCampaignOpen(false);
          setBulkCampaignId("");
          setRowSelection({});
        },
      }
    );
  };

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / params.pageSize));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Tasks
        </h1>
        <Link href="/admin/tasks/new" className={buttonVariants()}>
          New task
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="filter-type" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</Label>
            <SelectDropdown.Root
              value={params.type}
              onValueChange={(v) => setParams({ type: v as typeof params.type, page: 1 })}
              options={FILTER_TYPE_OPTIONS}
              placeholder="All"
              className="mt-1.5"
            >
              <SelectDropdown.Trigger />
              <SelectDropdown.Content />
            </SelectDropdown.Root>
          </div>
          <div>
            <Label htmlFor="filter-status" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</Label>
            <SelectDropdown.Root
              value={params.status}
              onValueChange={(v) => setParams({ status: v as typeof params.status, page: 1 })}
              options={FILTER_STATUS_OPTIONS}
              placeholder="All"
              className="mt-1.5"
            >
              <SelectDropdown.Trigger />
              <SelectDropdown.Content />
            </SelectDropdown.Root>
          </div>
          <div>
            <Label htmlFor="filter-campaign" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Campaign</Label>
            <SelectDropdown.Root
              value={params.campaignId}
              onValueChange={(v) => setParams({ campaignId: v, page: 1 })}
              options={FILTER_CAMPAIGN_OPTIONS}
              placeholder="All"
              className="mt-1.5"
            >
              <SelectDropdown.Trigger showSearchIcon />
              <SelectDropdown.Content />
            </SelectDropdown.Root>
          </div>
          <div>
            <Label htmlFor="filter-from" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Expires from</Label>
            <Input
              id="filter-from"
              type="date"
              value={params.expiresFrom}
              onChange={(e) => setParams({ expiresFrom: e.target.value, page: 1 })}
              className="mt-1.5 h-9 rounded-lg"
            />
          </div>
          <div>
            <Label htmlFor="filter-to" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Expires to</Label>
            <Input
              id="filter-to"
              type="date"
              value={params.expiresTo}
              onChange={(e) => setParams({ expiresTo: e.target.value, page: 1 })}
              className="mt-1.5 h-9 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkRewardOpen(true)}
            disabled={bulkUpdateMutation.isPending}
          >
            Bulk update reward
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkCampaignOpen(true)}
            disabled={bulkUpdateMutation.isPending}
          >
            Bulk update campaign
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={openBulkDeleteConfirm}
            disabled={deleteTasksMutation.isPending}
          >
            Bulk delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message ?? "Failed to load tasks."}</p>
        </div>
      )}
      {!isLoading && !error && (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border bg-muted/40">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        style={{ width: header.getSize() }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No tasks match the current filters.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => row.toggleExpanded()}
                        className={cn(
                          "border-b border-border/80 transition-colors cursor-pointer hover:bg-muted/40",
                          row.getIsSelected() && "bg-primary/5"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-4 text-sm"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {row.getIsExpanded() && (
                        <tr>
                          <td colSpan={columns.length} className="p-0">
                            <TaskRowExpansion task={row.original} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {(params.page - 1) * params.pageSize + 1}–{Math.min(params.page * params.pageSize, sortedTasks.length)} of {sortedTasks.length}
              </span>
              <select
                value={params.pageSize}
                onChange={(e) =>
                  setParams({ pageSize: Number(e.target.value), page: 1 })
                }
                className="h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParams({ page: params.page - 1 })}
                disabled={params.page <= 1}
              >
                Previous
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                Page {params.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParams({ page: params.page + 1 })}
                disabled={params.page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      <ConfirmDialogRoot
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setDeleteTargetIds([]);
        }}
      >
        <ConfirmDialogContent
          title={
            deleteTargetIds.length > 1
              ? `Delete ${deleteTargetIds.length} tasks?`
              : "Delete task?"
          }
          description={
            deleteTargetIds.length > 1
              ? `This will permanently delete ${deleteTargetIds.length} tasks and all their associated submissions. This action cannot be undone.`
              : (() => {
                  const task = tasks.find((t) => t.id === deleteTargetIds[0]);
                  const title = task?.title ?? "this task";
                  return `This will permanently delete '${title}' and all its submissions. This action cannot be undone.`;
                })()
          }
          confirmLabel={deleteTargetIds.length > 1 ? `Delete ${deleteTargetIds.length} tasks` : "Delete task"}
          variant="destructive"
          onConfirm={handleBulkDelete}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setDeleteTargetIds([]);
          }}
          loading={deleteTasksMutation.isPending}
        />
      </ConfirmDialogRoot>

      {/* Bulk reward modal */}
      <ConfirmDialogRoot open={bulkRewardOpen} onOpenChange={setBulkRewardOpen}>
        <ConfirmDialogContent
          title={`Edit ${selectedIds.length} tasks`}
          description={
            <>
              <p className="mb-3">
                This will update reward for all {selectedIds.length} selected tasks.
              </p>
              <Label htmlFor="bulk-reward">Amount ($)</Label>
              <Input
                id="bulk-reward"
                type="number"
                min="0"
                step="0.01"
                value={bulkRewardValue}
                onChange={(e) => setBulkRewardValue(e.target.value)}
                className="mt-1"
                placeholder="0.00"
              />
            </>
          }
          confirmLabel="Apply changes"
          variant="default"
          onConfirm={handleBulkReward}
          onCancel={() => setBulkRewardOpen(false)}
          loading={bulkUpdateMutation.isPending}
        />
      </ConfirmDialogRoot>

      {/* Bulk campaign modal */}
      <ConfirmDialogRoot open={bulkCampaignOpen} onOpenChange={setBulkCampaignOpen}>
        <ConfirmDialogContent
          title={`Edit ${selectedIds.length} tasks`}
          description={
            <>
              <p className="mb-3">
                This will update campaign for all {selectedIds.length} selected tasks.
              </p>
              <Label htmlFor="bulk-campaign">Campaign</Label>
              <select
                id="bulk-campaign"
                value={bulkCampaignId}
                onChange={(e) => setBulkCampaignId(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {mockCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          }
          confirmLabel="Apply changes"
          variant="default"
          onCancel={() => setBulkCampaignOpen(false)}
          onConfirm={handleBulkCampaign}
          loading={bulkUpdateMutation.isPending}
        />
      </ConfirmDialogRoot>

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

function SortHeader({
  column,
  label,
  sorting,
  setSort,
}: {
  column: { id: string };
  label: string;
  sorting: SortingState;
  setSort: (id: string, desc: boolean) => void;
}) {
  const current = sorting.find((s) => s.id === column.id);
  const isDesc = current?.desc ?? false;
  return (
    <button
      type="button"
      onClick={() => setSort(column.id, !isDesc)}
      className="flex items-center gap-1 font-medium hover:text-foreground"
    >
      {label}
      {current && (
        <span className="text-primary">{isDesc ? "↓" : "↑"}</span>
      )}
    </button>
  );
}
