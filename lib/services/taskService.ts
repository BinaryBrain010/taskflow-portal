import type { Task, TaskFilters, CreateTaskDTO, ProofType } from "@/lib/types";
import { getItem, setItem } from "@/lib/mock/storage";
import { readDelay, mutationDelay } from "@/lib/mock/delay";

const TASKS_STORAGE_KEY = "tasks" as const;

function getTasksFromStorage(): Task[] {
  const stored = getItem<Task[]>(TASKS_STORAGE_KEY);
  if (Array.isArray(stored) && stored.length > 0) return stored;
  const expanded = expandSeedForFeed();
  setItem(TASKS_STORAGE_KEY, expanded);
  return expanded;
}

function getSeedTasks(): Task[] {
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: "tsk_001",
      title: "Product survey: 5 questions",
      description: "Answer a short survey about your recent purchase experience.",
      type: "survey",
      status: "active",
      reward: 150,
      totalSlots: 100,
      filledSlots: 42,
      campaignId: "camp_001",
      requiredProofs: ["form" as ProofType],
      expiresAt: later,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tsk_002",
      title: "Review 10 social posts",
      description: "Rate and flag content for policy compliance. Mark inappropriate content.",
      type: "content_review",
      status: "active",
      reward: 320,
      totalSlots: 50,
      filledSlots: 18,
      campaignId: "camp_002",
      requiredProofs: ["screenshot" as ProofType, "text" as ProofType],
      expiresAt: later,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tsk_003",
      title: "Label 200 product images",
      description: "Assign category labels to product photos using the provided taxonomy.",
      type: "data_labeling",
      status: "active",
      reward: 850,
      totalSlots: 20,
      filledSlots: 7,
      campaignId: "camp_001",
      requiredProofs: ["file" as ProofType],
      expiresAt: later,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tsk_004",
      title: "Transcribe 5-min audio",
      description: "Transcribe the audio clip verbatim with speaker labels.",
      type: "transcription",
      status: "paused",
      reward: 500,
      totalSlots: 30,
      filledSlots: 12,
      campaignId: null,
      requiredProofs: ["text" as ProofType, "url" as ProofType],
      expiresAt: later,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tsk_005",
      title: "NPS follow-up survey",
      description: "Complete 3 open-ended follow-up questions after the NPS score.",
      type: "survey",
      status: "draft",
      reward: 200,
      totalSlots: 200,
      filledSlots: 0,
      campaignId: "camp_003",
      requiredProofs: ["form" as ProofType],
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tsk_006",
      title: "Moderate 25 comments",
      description: "Approve, reject, or escalate user comments per guidelines.",
      type: "content_review",
      status: "closed",
      reward: 280,
      totalSlots: 40,
      filledSlots: 40,
      campaignId: "camp_002",
      requiredProofs: ["screenshot" as ProofType],
      expiresAt: new Date().toISOString(),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/** Expand seed with many tasks for feed virtual scroll (1000+). */
function expandSeedForFeed(): Task[] {
  const base = getSeedTasks();
  const expanded: Task[] = [];
  const types: Task["type"][] = ["survey", "content_review", "data_labeling", "transcription"];
  const statuses: Task["status"][] = ["active", "active", "active", "paused", "closed"];
  for (let i = 0; i < 2000; i++) {
    const t = base[i % base.length]!;
    const type = types[i % types.length]!;
    const status = statuses[i % statuses.length]!;
    const id = `tsk_${String(i + 1).padStart(4, "0")}`;
    const created = new Date(Date.now() - i * 3600000).toISOString();
    expanded.push({
      ...t,
      id,
      title: `${t.title} #${i + 1}`,
      type,
      status,
      reward: Math.floor(100 + Math.random() * 900),
      totalSlots: 10 + (i % 100),
      filledSlots: Math.floor((i % 10) * 2),
      createdAt: created,
      updatedAt: created,
    });
  }
  return expanded;
}

function matchesFilters(task: Task, filters: TaskFilters | undefined): boolean {
  if (!filters) return true;
  if (filters.status != null) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    if (!statuses.includes(task.status)) return false;
  }
  if (filters.type != null) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    if (!types.includes(task.type)) return false;
  }
  if (filters.campaignId != null && task.campaignId !== filters.campaignId) return false;
  if (filters.search != null) {
    const q = filters.search.toLowerCase();
    if (
      !task.title.toLowerCase().includes(q) &&
      !task.description.toLowerCase().includes(q)
    )
      return false;
  }
  if (filters.expiresFrom != null && filters.expiresFrom !== "") {
    if (task.expiresAt == null) return false;
    const from = new Date(filters.expiresFrom).getTime();
    const exp = new Date(task.expiresAt).getTime();
    if (exp < from) return false;
  }
  if (filters.expiresTo != null && filters.expiresTo !== "") {
    if (task.expiresAt == null) return false;
    const toEnd = new Date(filters.expiresTo + "T23:59:59.999Z").getTime();
    const exp = new Date(task.expiresAt).getTime();
    if (exp > toEnd) return false;
  }
  return true;
}

function nextId(tasks: Task[]): string {
  const nums = tasks
    .map((t) => parseInt(t.id.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `tsk_${String(max + 1).padStart(3, "0")}`;
}

/**
 * Get tasks with optional filters. 1–3s delay, reads from localStorage.
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  await readDelay();
  const tasks = getTasksFromStorage();
  return tasks.filter((t) => matchesFilters(t, filters));
}

/**
 * Get a single task by id.
 */
export async function getTaskById(id: string): Promise<Task | null> {
  await readDelay();
  const tasks = getTasksFromStorage();
  return tasks.find((t) => t.id === id) ?? null;
}

/**
 * Create a task. 3–5s delay.
 */
export async function createTask(data: CreateTaskDTO): Promise<Task> {
  await mutationDelay();
  const tasks = getTasksFromStorage();
  const now = new Date().toISOString();
  const task: Task = {
    ...data,
    id: nextId(tasks),
    filledSlots: data.filledSlots ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  tasks.push(task);
  setItem(TASKS_STORAGE_KEY, tasks);
  return task;
}

/**
 * Update a task by id. 3–5s delay.
 */
export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  await mutationDelay();
  const tasks = getTasksFromStorage();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Task not found: ${id}`);
  const updated: Task = {
    ...tasks[index]!,
    ...data,
    id: tasks[index]!.id,
    updatedAt: new Date().toISOString(),
  };
  tasks[index] = updated;
  setItem(TASKS_STORAGE_KEY, tasks);
  return updated;
}

/**
 * Delete tasks by ids.
 */
export async function deleteTasks(ids: string[]): Promise<void> {
  await mutationDelay();
  const tasks = getTasksFromStorage();
  const set = new Set(ids);
  const next = tasks.filter((t) => !set.has(t.id));
  setItem(TASKS_STORAGE_KEY, next);
}

/**
 * Bulk update reward and/or campaignId for given task ids. 3–5s delay.
 */
export async function bulkUpdateTasks(
  ids: string[],
  data: Partial<Pick<Task, "reward" | "campaignId">>
): Promise<Task[]> {
  await mutationDelay();
  const tasks = getTasksFromStorage();
  const set = new Set(ids);
  const now = new Date().toISOString();
  const updated: Task[] = [];
  for (let i = 0; i < tasks.length; i++) {
    if (!set.has(tasks[i]!.id)) continue;
    const next: Task = {
      ...tasks[i]!,
      ...(data.reward != null && { reward: data.reward }),
      ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
      updatedAt: now,
    };
    tasks[i] = next;
    updated.push(next);
  }
  setItem(TASKS_STORAGE_KEY, tasks);
  return updated;
}
