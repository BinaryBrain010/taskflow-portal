import { z } from "zod";

const taskTypeEnum = z.enum(["survey", "content_review", "data_labeling", "transcription"]);
const taskStatusEnum = z.enum(["draft", "active", "paused", "closed"]);
const proofTypeEnum = z.enum(["screenshot", "file", "url", "text", "form"]);

export const taskComposerSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string(),
  type: taskTypeEnum,
  status: taskStatusEnum,
  reward: z.number().int().min(0, "Reward must be ≥ 0 cents"),
  totalSlots: z.number().int().min(1, "At least 1 slot"),
  campaignId: z.string().nullable(),
  requiredProofs: z.array(proofTypeEnum).min(1, "Select at least one proof type"),
  expiresAt: z.string().nullable(),
});

export type TaskComposerFormValues = z.infer<typeof taskComposerSchema>;

export const defaultValues: TaskComposerFormValues = {
  title: "",
  description: "",
  type: "survey",
  status: "draft",
  reward: 0,
  totalSlots: 10,
  campaignId: null,
  requiredProofs: [],
  expiresAt: null,
};
