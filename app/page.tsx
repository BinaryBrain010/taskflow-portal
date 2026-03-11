import Link from "next/link";

/**
 * Root landing. Middleware redirects authenticated users to /admin or /feed
 * and unauthenticated to /login. This page is a fallback if / is reached.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="w-full max-w-md space-y-8 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          TaskFlow
        </h1>
        <p className="text-muted-foreground">
          Micro-task marketplace for admins and workers.
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </main>
    </div>
  );
}
