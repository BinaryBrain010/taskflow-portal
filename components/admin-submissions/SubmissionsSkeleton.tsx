"use client";

const ROW_COUNT = 12;
const GRID_CLASS =
  "grid grid-cols-[1fr_1fr_7rem_80px_80px_48px_64px] gap-2 items-center px-3";

export function SubmissionsSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`sticky top-0 z-10 ${GRID_CLASS} border-b border-border bg-card py-2`}
      >
        <div className="h-3 w-14 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-10 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-3 w-10 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted justify-self-end" />
      </div>
      <div className="flex-1 overflow-hidden py-0">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <div
            key={i}
            className={`${GRID_CLASS} border-b border-border/60 py-2 last:border-b-0`}
            style={{ minHeight: 40 }}
          >
            <div className="flex items-center gap-2">
              <div className="size-6 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            <div className="h-7 w-14 animate-pulse rounded bg-muted justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}
