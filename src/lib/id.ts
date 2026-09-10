let counter = 0

/** Stable-enough client id for mock records and new editor blocks. */
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`
}
