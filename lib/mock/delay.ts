/**
 * Simulates network/API delay for mock data layer.
 * Use: 1–3s for reads, 3–5s for mutations.
 */

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 1–3s delay for reads */
export const readDelay = () => randomDelay(1000, 3000);

/** 3–5s delay for mutations */
export const mutationDelay = () => randomDelay(3000, 5000);
