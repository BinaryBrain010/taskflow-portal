export default function MyTasksPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        My tasks
      </h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16 px-4">
        <p className="text-center text-muted-foreground">
          Your claimed and submitted tasks will appear here.
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Complete tasks from the feed to see them listed here.
        </p>
      </div>
    </div>
  );
}
