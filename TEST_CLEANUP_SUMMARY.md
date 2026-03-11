# Test and cleanup summary

## Part 1 — Bloat removed

| File | Change |
|------|--------|
| `components/app-shell.tsx` | **Deleted.** Unused component; admin and worker flows use `admin-shell` and `worker-shell` instead. |
| `components/ui/confirm-dialog.tsx` | Removed unused export `Dialog as ConfirmDialogDialog` (never imported). |

No console.logs, commented-out code, or TODO/FIXME found. Inline styles that remain are for dynamic values (e.g. virtualizer height, progress %) and are intentional.

## Part 2 — Tests added (colocated)

| Location | Coverage |
|----------|----------|
| `lib/mock/delay.test.ts` | `randomDelay`, `readDelay`, `mutationDelay` (fake timers). |
| `lib/mock/storage.test.ts` | `getItem` (null, parsed, corrupted JSON), `setItem`, `removeItem`, `STORAGE_KEYS`. |
| `lib/services/taskService.test.ts` | `getTasks`, `getTaskById`, `createTask`, `updateTask`, `deleteTasks`, `bulkUpdateTasks`; filters, persistence, not-found/errors. |
| `lib/services/submissionService.test.ts` | `getSubmissions`, `getSubmissionById`, `createSubmission`, `reviewSubmission`; filters, populate, not-found. |
| `components/task-composer/taskComposerSchema.test.ts` | Valid/invalid inputs, edge cases (empty title, negative reward, 0 slots, empty requiredProofs), `defaultValues`. |
| `hooks/useTasks.test.tsx` | `useTasksQuery` (loading, success, error), `useTaskQuery` (enabled when id set, null when not found). |
| `hooks/useSubmissions.test.tsx` | `useSubmissionsQuery` (loading, success, error), `useSubmissionQuery` (enabled when id set). |
| `components/feed/TaskCard.test.tsx` | Renders title, reward, slots, type badge; urgency when slots < 10%; onClick. |
| `components/admin-submissions/SubmissionRow.test.tsx` | Renders worker name, task title, status badge; workerId fallback; onClick. |
| `components/task-composer/TaskComposer.test.tsx` | Validation errors on submit (empty title, empty requiredProofs); edit mode pre-fills title, reward, totalSlots. |

## Setup

- **Vitest** (v4) with jsdom, `vitest.config.ts` and `vitest.setup.ts` (jest-dom).
- **Scripts:** `npm run test` (single run), `npm run test:watch` (watch).
- Path alias `@/` resolved in Vitest config.

## Run

```bash
npm run test
```

All 70 tests pass; `npx tsc --noEmit` passes.
