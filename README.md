# TaskFlow — Micro-task Marketplace

**v1.0.0** — Production-ready demo release.

A demo micro-task marketplace: **admins** create and manage tasks and review submissions; **workers** browse tasks and submit work. Built with Next.js (App Router), React, TypeScript, Tailwind, and a customized design system. All data is stored in **localStorage** with simulated API delays.

---

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` if not authenticated.

### Build and run production

```bash
npm run build
npm start
```

---

## Test credentials

| Role   | Email           | Password  |
|--------|-----------------|-----------|
| Admin  | admin@app.com   | password  |
| Worker | worker@app.com  | password  |

After login, admins are sent to `/admin`; workers to `/feed`.

---

## Feature list

- **Authentication**: Mock login, session in localStorage + cookie for middleware, role-based redirects, logout.
- **Admin**
  - **Tasks** (`/admin/tasks`): Table with filters (type, status, campaign, date range), sort, pagination, row selection, bulk update reward/campaign and bulk delete. Row expansion shows submissions and approval breakdown. Edit (composer) and Delete (confirm dialog) per row.
  - **Task composer** (`/admin/tasks/new`, `/admin/tasks/[id]/edit`): Create/edit task (title, markdown description, type, status, reward, slots, campaign, required proofs, expiry). Validation with Zod + React Hook Form. Submit with progress; success toast with “Create Another” / “View Task”.
  - **Submissions** (`/admin/submissions`): List with status tabs (All / Pending / Approved / Rejected), view toggle (grouped by task vs flat), filters (task, worker, date range), sort (newest/oldest). Virtualized flat list. Detail sidebar: proof previews, task context, worker snippet, Approve/Reject with optional note; 3–5s review with optimistic update and toast. Mobile: detail in bottom sheet.
  - **Users** (`/admin/users`): Placeholder.
  - **Dashboard** (`/admin`): Placeholder.
- **Worker**
  - **Task feed** (`/feed`): Virtual list of active tasks, sort (Latest / Highest Reward), type tabs (All, Survey, Content Review, Data Labeling, Transcription). Task cards show title, type, reward, slots left, urgency, expiry. Task detail in right sidebar (desktop) or bottom sheet (mobile); markdown description, proof requirements, inline submission form with 3–5s progress.
  - **My tasks** (`/feed/my-tasks`): Placeholder empty state.
- **Design**: Custom teal/amber palette, Syne (display) + Figtree (body), Shadcn/Base UI customized. Loading, empty, and error states on async flows. Mobile-friendly worker shell and feed.

---

## Folder structure

```
app/
  layout.tsx          # Root layout, fonts, NuqsAdapter, Query provider
  page.tsx            # Landing (fallback; middleware redirects / to /login or app)
  login/page.tsx
  admin/
    layout.tsx        # AdminShell (sidebar)
    page.tsx          # Dashboard placeholder
    tasks/page.tsx    # Task table, filters, bulk actions, row expansion
    tasks/new/page.tsx
    tasks/[id]/edit/page.tsx
    submissions/page.tsx
    users/page.tsx
  feed/
    layout.tsx        # WorkerShell (navbar)
    page.tsx          # Task feed (virtual list, detail sidebar/sheet)
    my-tasks/page.tsx
components/
  ui/                 # Button, Input, Label, Sheet, Checkbox, Select, confirm-dialog
  admin-shell.tsx
  worker-shell.tsx
  task-composer/      # TaskComposer, MarkdownEditor, CampaignSelect, schema
  feed/               # TaskCard, TaskDetailPanel, MarkdownContent
  admin-tasks/        # TaskRowExpansion
  admin-submissions/  # SubmissionRow, SubmissionDetailSidebar, TaskSearchSelect
hooks/
  useAuth.ts
  useTasks.ts
  useSubmissions.ts
  useIsMobile.ts
lib/
  types.ts            # User, Task, Submission, filters, DTOs
  auth.ts             # Mock auth, session, cookie
  utils.ts
  mock/               # storage, delay, mockUsers, mockTasks, mockCampaigns, mockSubmissions
  services/           # taskService, submissionService
middleware.ts         # Route protection (cookie-based)
CLAUDE.md             # AI context: prompts, architecture, limitations
```

---

## Scripts

- `npm run dev` — Development server
- `npm run build` — Production build
- `npm start` — Run production server
- `npm run lint` — ESLint

---

## Notes

- Data is stored in **localStorage** only; no backend. Clearing site data resets everything.
- Task list is seeded with 2000 tasks on first load (when storage is empty) to demonstrate virtual scrolling.
- See **CLAUDE.md** for prompts used during development, architectural decisions, and known limitations.
