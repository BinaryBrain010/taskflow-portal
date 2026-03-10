"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { TaskComposer } from "@/components/task-composer/TaskComposer";
import { useTaskQuery } from "@/hooks/useTasks";

export default function EditTaskPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  const { data: task, isLoading, error } = useTaskQuery(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Edit task</h1>
        <p className="text-destructive">Task not found or failed to load.</p>
        <Link href="/admin/tasks" className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-2.5 text-sm font-medium hover:bg-muted hover:text-foreground">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Edit task
      </h1>
      <TaskComposer task={task} />
    </div>
  );
}
