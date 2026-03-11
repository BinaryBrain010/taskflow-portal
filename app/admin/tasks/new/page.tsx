import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TaskComposer } from "@/components/task-composer/TaskComposer";

export default function NewTaskPage() {
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        <Link href="/admin/tasks" className="hover:text-foreground">Tasks</Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        <span className="text-foreground" aria-current="page">Create task</span>
      </nav>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Create task
      </h1>
      <TaskComposer />
    </div>
  );
}
