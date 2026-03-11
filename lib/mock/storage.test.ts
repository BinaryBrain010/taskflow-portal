import { describe, it, expect, beforeEach } from "vitest";
import { getItem, setItem, removeItem, STORAGE_KEYS } from "./storage";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getItem", () => {
    it("returns null when key is not set", () => {
      expect(getItem("tasks")).toBeNull();
      expect(getItem("users")).toBeNull();
      expect(getItem("submissions")).toBeNull();
    });

    it("returns parsed value when key is set", () => {
      const data = [{ id: "1", title: "Task" }];
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(data));
      expect(getItem<typeof data>("tasks")).toEqual(data);
    });

    it("returns null for corrupted JSON", () => {
      localStorage.setItem(STORAGE_KEYS.tasks, "not valid json {");
      expect(getItem("tasks")).toBeNull();
    });

    it("returns null for empty string value", () => {
      localStorage.setItem(STORAGE_KEYS.tasks, "");
      expect(getItem("tasks")).toBeNull();
    });
  });

  describe("setItem", () => {
    it("persists value so getItem returns it", () => {
      const data = [{ id: "1" }];
      setItem("tasks", data);
      expect(getItem<typeof data>("tasks")).toEqual(data);
    });

    it("overwrites existing value", () => {
      setItem("tasks", [1]);
      setItem("tasks", [2]);
      expect(getItem<number[]>("tasks")).toEqual([2]);
    });
  });

  describe("removeItem", () => {
    it("removes value so getItem returns null", () => {
      setItem("tasks", []);
      removeItem("tasks");
      expect(getItem("tasks")).toBeNull();
    });
  });
});
