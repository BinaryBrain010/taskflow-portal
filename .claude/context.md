# TaskFlow — Codebase context for AI

## What this project is

TaskFlow is a **micro-task marketplace** demo: admins create and manage tasks; workers browse the feed and submit work. No real backend; all data is in **localStorage** with simulated delays (1–3s read, 3–5s mutation).

## Tech stack

- **Next.js 16** (App Router), React 19, TypeScript
- **Tailwind CSS 4** + customized Shadcn/Base UI (teal/amber design system; Syne + Figtree fonts)
- **TanStack Query** (server state), **TanStack Table** (admin tasks table)
- **Zod** + **React Hook Form** (validation, forms)
- **nuqs** (URL state for filters, sort, pagination)
- **react-markdown** (task description rendering)

## Routes and roles

- **Unauthenticated**: `/` → redirect to `/login`. `/login` — email/password (see README for credentials).
- **Admin** (`/admin/*`): Dashboard, Tasks (table + composer), Submissions (grouped/flat, review sidebar), Users (placeholder). Layout: collapsible sidebar.
- **Worker** (`/feed`, `/feed/my-tasks`): Task feed (virtual list, type tabs, sort), task detail in sidebar/sheet, submit form. Layout: top navbar, mobile drawer.

## Key files

- **Auth**: `lib/auth.ts` (validate, persist, clear), `hooks/useAuth.ts`, `middleware.ts` (cookie-based redirect).
- **Tasks**: `lib/services/taskService.ts`, `hooks/useTasks.ts`, `lib/types.ts` (Task, TaskFilters).
- **Submissions**: `lib/services/submissionService.ts`, `hooks/useSubmissions.ts` (getSubmissions, create, review).
- **Mock**: `lib/mock/storage.ts`, `delay.ts`, `mockUsers.ts`, `mockCampaigns.ts`; tasks/submissions in localStorage, seed when empty.
- **UI**: `components/ui/` (Button, Input, Label, Sheet, Checkbox, Select, confirm-dialog), `admin-shell`, `worker-shell`; feed (TaskCard, TaskDetailPanel, MarkdownContent); admin (TaskComposer, TaskRowExpansion, SubmissionRow, SubmissionDetailSidebar, TaskSearchSelect).

## Conventions

- Use **design tokens** from `globals.css` (e.g. `bg-primary`, `text-muted-foreground`). No raw purple/gray defaults.
- **Loading**: show "Loading…" or skeleton for async data. **Empty**: explicit message (e.g. "No tasks match the filters."). **Error**: show `error.message` in destructive-style block.
- **Mobile**: worker feed and admin submissions use `useIsMobile()`; detail is sidebar on desktop, bottom Sheet on mobile. Touch targets ≥ 44px where possible.
- **Forms**: Zod schema + RHF; optional `setValueAs` for number inputs. No `asChild` on Button (Base UI); use `Link` + `buttonVariants()` for link-styled buttons.
