"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Task, ProofType } from "@/lib/types";
import { getCampaigns } from "@/lib/mock/mockCampaigns";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { MarkdownEditor } from "./MarkdownEditor";
import { ExpiryDatePicker } from "./ExpiryDatePicker";
import { taskComposerSchema, defaultValues, type TaskComposerFormValues } from "./taskComposerSchema";
import { useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

const TASK_TYPES: { value: TaskComposerFormValues["type"]; label: string }[] = [
  { value: "survey", label: "Survey" },
  { value: "content_review", label: "Content review" },
  { value: "data_labeling", label: "Data labeling" },
  { value: "transcription", label: "Transcription" },
];

const TASK_STATUSES: { value: TaskComposerFormValues["status"]; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

const PROOF_OPTIONS: { value: ProofType; label: string }[] = [
  { value: "screenshot", label: "Screenshot" },
  { value: "file", label: "File" },
  { value: "url", label: "URL" },
  { value: "text", label: "Text" },
  { value: "form", label: "Form" },
];

const CAMPAIGN_OPTIONS = [
  { value: "", label: "None" },
  ...getCampaigns().map((c) => ({ value: c.id, label: c.name })),
];

function taskToFormValues(task: Task): TaskComposerFormValues {
  const expiresAt = task.expiresAt
    ? task.expiresAt.slice(0, 16)
    : null;
  return {
    title: task.title,
    description: task.description,
    type: task.type,
    status: task.status,
    reward: task.reward,
    totalSlots: task.totalSlots,
    campaignId: task.campaignId ?? null,
    requiredProofs: [...task.requiredProofs],
    expiresAt,
  };
}

function formValuesToPayload(values: TaskComposerFormValues): Omit<Task, "id" | "createdAt" | "updatedAt" | "filledSlots"> & { filledSlots?: number } {
  return {
    title: values.title,
    description: values.description,
    type: values.type,
    status: values.status,
    reward: values.reward,
    totalSlots: values.totalSlots,
    campaignId: values.campaignId || null,
    requiredProofs: values.requiredProofs,
    expiresAt: values.expiresAt || null,
  };
}

export function TaskComposer({ task }: { task?: Task | null }) {
  const isEdit = !!task;
  const [successTask, setSuccessTask] = useState<Task | null>(null);
  const [submitProgress, setSubmitProgress] = useState(0);

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

  const form = useForm<TaskComposerFormValues>({
    resolver: zodResolver(taskComposerSchema),
    defaultValues: task ? taskToFormValues(task) : defaultValues,
  });

  useEffect(() => {
    if (task) form.reset(taskToFormValues(task));
  }, [task, form]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: TaskComposerFormValues) {
    setSuccessTask(null);
    setSubmitProgress(0);
    const start = Date.now();
    const duration = 3000 + Math.random() * 2000;
    const tick = () => {
      const elapsed = Date.now() - start;
      setSubmitProgress(Math.min(100, (elapsed / duration) * 100));
      if (elapsed < duration) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    try {
      if (isEdit && task) {
        const updated = await updateMutation.mutateAsync({
          id: task.id,
          data: formValuesToPayload(values),
        });
        await new Promise((r) => setTimeout(r, duration - (Date.now() - start)));
        setSubmitProgress(100);
        setSuccessTask(updated);
      } else {
        const created = await createMutation.mutateAsync(formValuesToPayload(values));
        await new Promise((r) => setTimeout(r, Math.max(0, duration - (Date.now() - start))));
        setSubmitProgress(100);
        setSuccessTask(created);
        form.reset(defaultValues);
      }
    } catch (e) {
      setSubmitProgress(0);
      form.setError("root", { message: e instanceof Error ? e.message : "Something went wrong" });
    }
  }

  if (successTask) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <span className="text-lg font-medium">Task saved successfully.</span>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          {successTask.title} has been {isEdit ? "updated" : "created"}.
        </p>
        <div className="flex flex-wrap gap-2">
          {!isEdit && (
            <Button
              variant="outline"
              onClick={() => {
                setSuccessTask(null);
              }}
            >
              Create another
            </Button>
          )}
          <Link href={`/admin/tasks/${successTask.id}/edit`} className={buttonVariants()}>
            View task
          </Link>
          <Link href="/admin/tasks" className={buttonVariants({ variant: "ghost" })}>
            Back to tasks
          </Link>
        </div>
      </div>
    );
  }

  const rewardCents = form.watch("reward");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {form.formState.errors.root && (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      )}

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <h2 className="border-b border-border px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
          Basics
        </h2>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...form.register("title")}
              className={form.formState.errors.title ? "border-destructive" : ""}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Description (markdown)</Label>
            <MarkdownEditor
              value={form.watch("description")}
              onChange={(v) => form.setValue("description", v, { shouldValidate: true })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <h2 className="border-b border-border px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
          Type & Status
        </h2>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <SelectDropdown.Root
              value={form.watch("type")}
              onValueChange={(v) => form.setValue("type", v as TaskComposerFormValues["type"], { shouldValidate: true })}
              options={TASK_TYPES}
              placeholder="Type"
            >
              <SelectDropdown.Trigger
                className={form.formState.errors.type ? "border-destructive" : ""}
              />
              <SelectDropdown.Content />
            </SelectDropdown.Root>
            {form.formState.errors.type && (
              <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <SelectDropdown.Root
              value={form.watch("status")}
              onValueChange={(v) => form.setValue("status", v as TaskComposerFormValues["status"], { shouldValidate: true })}
              options={TASK_STATUSES}
              placeholder="Status"
            >
              <SelectDropdown.Trigger />
              <SelectDropdown.Content />
            </SelectDropdown.Root>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <h2 className="border-b border-border px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
          Reward & Capacity
        </h2>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reward">Reward</Label>
            <div className="flex h-9 w-full items-center rounded-lg border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <span className="pl-3 text-sm text-muted-foreground">$</span>
              <input
                id="reward"
                type="number"
                min={0}
                step={0.01}
                value={rewardCents / 100}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const cents = Number.isNaN(val) ? 0 : Math.round(val * 100);
                  form.setValue("reward", cents, { shouldValidate: true });
                }}
                className={cn(
                  "h-full min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                  form.formState.errors.reward && "text-destructive"
                )}
              />
            </div>
            {form.formState.errors.reward && (
              <p className="text-xs text-destructive">{form.formState.errors.reward.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalSlots">Total slots</Label>
            <Input
              id="totalSlots"
              type="number"
              min={1}
              {...form.register("totalSlots", { setValueAs: (v) => (v === "" ? 1 : Number(v)) })}
              className={form.formState.errors.totalSlots ? "border-destructive" : ""}
            />
            {form.formState.errors.totalSlots && (
              <p className="text-xs text-destructive">{form.formState.errors.totalSlots.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <h2 className="border-b border-border px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Campaign & Proofs
          </h2>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="campaignId">Campaign</Label>
              <SelectDropdown.Root
                value={form.watch("campaignId") ?? ""}
                onValueChange={(v) => form.setValue("campaignId", v || null, { shouldValidate: true })}
                options={CAMPAIGN_OPTIONS}
                placeholder="None"
                className="mt-0"
              >
                <SelectDropdown.Trigger showSearchIcon />
                <SelectDropdown.Content />
              </SelectDropdown.Root>
            </div>
            <div className="space-y-2">
              <Label>Required proofs</Label>
              <div className="flex flex-wrap gap-2">
                {PROOF_OPTIONS.map((o) => {
                  const checked = form.watch("requiredProofs").includes(o.value);
                  return (
                    <label
                      key={o.value}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.getValues("requiredProofs"), o.value]
                            : form.getValues("requiredProofs").filter((p) => p !== o.value);
                          form.setValue("requiredProofs", next, { shouldValidate: true });
                        }}
                        className="size-4 border-2"
                      />
                      <span>{o.label}</span>
                    </label>
                  );
                })}
              </div>
              {form.formState.errors.requiredProofs && (
                <p className="text-xs text-destructive">{form.formState.errors.requiredProofs.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          <h2 className="border-b border-border px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Expiry
          </h2>
          <div className="space-y-2 p-4">
            <Label htmlFor="expiresAt">Expires at (optional)</Label>
            <ExpiryDatePicker
              id="expiresAt"
              value={form.watch("expiresAt")}
              onChange={(v) => form.setValue("expiresAt", v)}
              aria-invalid={!!form.formState.errors.expiresAt}
            />
          </div>
        </div>
      </div>

      {isPending && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${submitProgress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Saving task…</p>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isEdit ? "Update task" : "Create task"}
          </Button>
          <Link href="/admin/tasks" className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
