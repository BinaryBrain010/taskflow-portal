import { WorkerShell } from "@/components/worker-shell";

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkerShell>{children}</WorkerShell>;
}
