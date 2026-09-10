/** Deterministic PRNG so the mock dataset is identical on every reload. */
export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!
}

export function between(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

/** ISO string `days` before the fixed dataset "now". */
export const NOW = new Date('2026-09-09T09:00:00.000Z').getTime()

export function daysAgo(days: number, hours = 0): string {
  return new Date(NOW - days * 86_400_000 - hours * 3_600_000).toISOString()
}

export function daysAhead(days: number): string {
  return new Date(NOW + days * 86_400_000).toISOString()
}
