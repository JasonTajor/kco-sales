/** Simulated network latency so loading and skeleton states are real code paths. */
export function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
