import { describe, it, expect } from "vitest";
import { taskComposerSchema, defaultValues } from "./taskComposerSchema";

describe("taskComposerSchema", () => {
  const validInput = {
    title: "Valid task",
    description: "Description here",
    type: "survey",
    status: "draft",
    reward: 100,
    totalSlots: 10,
    campaignId: null,
    requiredProofs: ["form"],
    expiresAt: null,
  };

  describe("valid inputs", () => {
    it("passes with all required fields and valid type/status", () => {
      const result = taskComposerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("passes with past expiry date string", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        expiresAt: "2020-01-01T00:00",
      });
      expect(result.success).toBe(true);
    });

    it("passes with reward 0", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        reward: 0,
      });
      expect(result.success).toBe(true);
    });

    it("passes with totalSlots 1", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        totalSlots: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("fails when title is empty", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        title: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("Title"))).toBe(true);
      }
    });

    it("fails when title too long", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        title: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("fails when reward is negative", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        reward: -1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("Reward") || i.message.includes("0"))).toBe(true);
      }
    });

    it("fails when totalSlots is 0", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        totalSlots: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("slot") || i.message.includes("1"))).toBe(true);
      }
    });

    it("fails when requiredProofs is empty", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        requiredProofs: [],
      });
      expect(result.success).toBe(false);
    });

    it("fails when type is invalid", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        type: "invalid_type",
      });
      expect(result.success).toBe(false);
    });

    it("fails when status is invalid", () => {
      const result = taskComposerSchema.safeParse({
        ...validInput,
        status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("defaultValues", () => {
    it("has expected shape and defaults", () => {
      expect(defaultValues.title).toBe("");
      expect(defaultValues.description).toBe("");
      expect(defaultValues.type).toBe("survey");
      expect(defaultValues.status).toBe("draft");
      expect(defaultValues.reward).toBe(0);
      expect(defaultValues.totalSlots).toBe(10);
      expect(defaultValues.campaignId).toBeNull();
      expect(defaultValues.requiredProofs).toEqual([]);
      expect(defaultValues.expiresAt).toBeNull();
    });
  });
});
