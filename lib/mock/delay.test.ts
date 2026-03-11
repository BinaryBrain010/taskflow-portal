import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomDelay, readDelay, mutationDelay } from "./delay";

describe("delay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("randomDelay", () => {
    it("resolves after a delay within [minMs, maxMs]", async () => {
      const minMs = 100;
      const maxMs = 200;
      const promise = randomDelay(minMs, maxMs);
      vi.advanceTimersByTime(99);
      await Promise.resolve();
      expect(await Promise.race([promise, Promise.resolve("pending")])).toBe("pending");
      vi.advanceTimersByTime(150);
      await expect(promise).resolves.toBeUndefined();
    });

    it("uses minMs when minMs equals maxMs", async () => {
      const promise = randomDelay(50, 50);
      vi.advanceTimersByTime(50);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe("readDelay", () => {
    it("returns a promise that resolves after 1–3s range", async () => {
      const promise = readDelay();
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      vi.advanceTimersByTime(2500);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe("mutationDelay", () => {
    it("returns a promise that resolves after 3–5s range", async () => {
      const promise = mutationDelay();
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
      vi.advanceTimersByTime(2500);
      await expect(promise).resolves.toBeUndefined();
    });
  });
});
