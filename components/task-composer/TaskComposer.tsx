"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Task, ProofType } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MarkdownEditor } from "./MarkdownEditor";
import { CampaignSelect } from "./CampaignSelect";
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

  const rewardCents = form.watch("reward");
  const rewardDollars = (rewardCents / 100).toFixed(2);

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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {form.formState.errors.root && (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-1">
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
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Type & status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              {...form.register("type")}
              className={form.formState.errors.type ? "border-destructive" : ""}
            >
              {TASK_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" {...form.register("status")}>
              {TASK_STATUSES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Reward & capacity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reward">Reward (cents)</Label>
            <Input
              id="reward"
              type="number"
              min={0}
              {...form.register("reward", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
              className={form.formState.errors.reward ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">
              ≈ <strong className="text-foreground">${rewardDollars}</strong> USD
            </p>
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
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Campaign & proofs</h2>
        <div className="grid gap-4 sm:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="campaignId">Campaign</Label>
            <CampaignSelect
              id="campaignId"
              value={form.watch("campaignId") ?? ""}
              onChange={(v) => form.setValue("campaignId", v || null, { shouldValidate: true })}
              aria-invalid={!!form.formState.errors.campaignId}
            />
          </div>
          <div className="space-y-2">
            <Label>Required proofs</Label>
            <div className="flex flex-wrap gap-4">
              {PROOF_OPTIONS.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={form.watch("requiredProofs").includes(o.value)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.getValues("requiredProofs"), o.value]
                        : form.getValues("requiredProofs").filter((p) => p !== o.value);
                      form.setValue("requiredProofs", next, { shouldValidate: true });
                    }}
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
            {form.formState.errors.requiredProofs && (
              <p className="text-xs text-destructive">{form.formState.errors.requiredProofs.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Expiry</h2>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expires at (optional)</Label>
          <Input
            id="expiresAt"
            type="datetime-local"
            value={form.watch("expiresAt") ?? ""}
            onChange={(e) => form.setValue("expiresAt", e.target.value || null)}
          />
        </div>
      </section>

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

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isEdit ? "Update task" : "Create task"}
        </Button>
        <Link href="/admin/tasks" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
