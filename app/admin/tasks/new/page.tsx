import { TaskComposer } from "@/components/task-composer/TaskComposer";

export default function NewTaskPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        New task
      </h1>
      <TaskComposer />
    </div>
  );
}
