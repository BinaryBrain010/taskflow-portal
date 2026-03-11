# CLAUDE.md — AI assistant context for TaskFlow

This file documents the prompts used during development, key architectural decisions, and known limitations so that future AI-assisted work stays consistent.

---

## Prompts used throughout development

1. **Project setup**
   - "Scaffold the full Next.js project" with tech stack: Next.js (App Router), React, TypeScript, Tailwind, Shadcn (customized), TanStack Table + Query, Zod, RHF, nuqs, Lexical, mock data (localStorage). Design inspiration: Preline Pro CRM. Two roles: Admin, Worker. Mock delays 1–3s reads, 3–5s mutations. Feature-based folder structure.

2. **Auth and shell**
   - "Build mock authentication and the app shell": login (admin@app.com / worker@app.com, password), localStorage + useAuth(), route protection, Admin layout (collapsible sidebar, Tasks/Submissions/Users), Worker layout (top navbar, filter tabs), logout. Customize Sheet/NavigationMenu to design system.

3. **Task service**
   - "Build the complete mock API/service layer for Tasks": getTasks, getTaskById, createTask, updateTask, deleteTasks, bulkUpdateTasks; Task type with specific fields; TanStack Query hooks (useTasksQuery, useTaskQuery, useCreateTask, etc.).

4. **Task composer**
   - "Build the Task Composer" at /admin/tasks/new and /admin/tasks/[id]/edit: form fields (title, description with Lexical markdown, type, status, reward, totalSlots, campaignId, requiredProofs, expiresAt), Zod + RHF, 3–5s submit with progress, success toast with "Create Another" / "View Task", edit pre-fill. Searchable campaign dropdown. (Lexical was later simplified to a textarea + markdown toolbar.)

5. **Worker feed**
   - "Build the worker-facing Task Feed at /feed": virtual scroll (TanStack Virtual), sort (Latest / Highest Reward) and type tabs via nuqs, task cards (title, type badge, reward, slots left, urgency &lt;10%, expiry), no campaignId. Task detail in right sidebar (desktop) / bottom sheet (mobile), markdown description, proof requirements, inline submission form with 3–5s progress. Loading/empty/error states.

6. **Admin task management**
   - "Build the admin Task Management screen at /admin/tasks": TanStack Table with columns (checkbox, title, type, status, reward, totalSlots, filledSlots, slotsLeft, campaignId, expiresAt, actions), row actions (Edit, Delete with confirm, View Submissions), bulk actions (bulk reward, bulk campaign, bulk delete), nuqs filters (type, status, campaignId, date range), sorting, pagination, row expansion with submissions and approval breakdown. Custom table styling.

7. **Submission service**
   - "Build the complete mock API/service layer for Submissions": Submission type (id, taskId, workerId, status pending|approved|rejected, proofUrls, submittedAt, reviewedAt, reviewNote, task/worker populated). getSubmissions(filters), getSubmissionById, createSubmission, reviewSubmission(id, action, note). SubmissionFilters (status, taskId, workerId, dateRange, groupByTask). TanStack Query hooks.

8. **Admin submissions screen**
   - "Build the admin Submissions screen at /admin/submissions": virtualized list, default grouped by task (collapsible), toggle flat/grouped, status tabs (All|Pending|Approved|Rejected) + task/worker/date filters, sort newest/oldest. Row: worker name + avatar, task title link, status badge, submitted time, proof thumbnails. Detail sidebar: full proof previews, task context, worker snippet, Approve/Reject + note, 3–5s review with optimistic update and toast. Mobile: sidebar → bottom sheet.

9. **Final polish**
   - "Final polish pass and submission prep": audit loading/empty/error on every screen, worker-facing mobile responsiveness, CLAUDE.md, .claude/, README, TypeScript check, docs commit.

---

## Key architectural decisions and why

- **Design system**: Custom palette (teal primary, amber accent) and typography (Syne display, Figtree body) in `globals.css` and Tailwind theme. Shadcn and Base UI components are customized (e.g. Sheet, Button) so the app does not look like default Shadcn.

- **Auth**: Client-side only; session in localStorage and a minimal cookie (`auth_role`) for middleware. Middleware cannot read localStorage, so the cookie is set on login and checked for redirects. useAuth() syncs from localStorage and redirects to /login if missing.

- **Mock data**: All persistence in localStorage via `lib/mock/storage.ts` (keys: mtm_users, mtm_tasks, mtm_submissions). Services in `lib/services/` use readDelay/mutationDelay and read/write through storage. Task seed expands to 2000 items when storage is empty to exercise virtual scroll.

- **Forms**: Zod schemas + React Hook Form with @hookform/resolvers. Number inputs use `setValueAs` for coercion where needed (Zod 4 + RHF). No stock form components; inputs/labels/selects are custom or Shadcn-style primitives.

- **URL state**: nuqs for filters, sort, view mode, pagination (e.g. feed sort/type, admin tasks filters, admin submissions status/view). Keeps state shareable and back-button friendly.

- **Detail panels**: Worker feed and admin submissions use a right sidebar on desktop and a bottom Sheet on mobile (useIsMobile &lt; 768px). No modal for primary detail to match “Discord-style” panel.

- **Lexical**: Full Lexical markdown editor was deferred; task description uses a textarea with a markdown toolbar (bold, italic, code, link) to ship faster. Can be replaced with Lexical later.

- **Submissions**: New model uses workerId, proofUrls, status pending|approved|rejected. Legacy stored fields (userId, content, submitted) are normalized when reading. createSubmission accepts proofUrls or content for backward compatibility with the worker form.

- **Optimistic updates**: Admin submission review uses onMutate to set query data (status) and onError to roll back. Toast on success/error.

---

## Known limitations and tradeoffs

- **No real backend**: All data is in localStorage; clearing storage or using another device loses data.
- **Middleware auth**: Only role is in a cookie; no JWT or server session. Suitable for demo only.
- **Markdown editor**: Description is a textarea + toolbar, not full Lexical.
- **My Tasks**: Placeholder screen; “claimed” tasks are not yet modeled (submissions exist, but no “my tasks” list from them).
- **Admin Dashboard / Users**: Placeholder content only.
- **Image proof URLs**: Proof thumbnails/previews assume image URLs or data URIs; non-image URLs show a “link” label. No upload; proofUrls are strings.
- **Duplicate git commits**: Early history may contain duplicate “scaffold” commits; feature work is in logical commits (auth, task service, composer, feed, admin tasks, submission service, admin submissions, docs).

---

## Folder structure (overview)

- `app/` — App Router pages and layouts (login, feed, admin/*).
- `components/` — UI: `ui/` (Button, Input, Sheet, etc.), `admin-shell`, `worker-shell`, `task-composer/`, `feed/`, `admin-tasks/`, `admin-submissions/`.
- `hooks/` — useAuth, useTasks, useSubmissions, useIsMobile.
- `lib/` — types, utils, mock (delay, storage, mockUsers, mockTasks, mockCampaigns, mockSubmissions), services (taskService, submissionService), auth.
- Root: middleware (auth redirects), CLAUDE.md, README.md, task.md (assignment brief).
