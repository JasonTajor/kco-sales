/** Human-friendly formatters. Kept pure so they are safe in render paths. */

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  const diff = now - then
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour

  if (diff < 45_000) return 'just now'
  if (diff < hour) return `${Math.round(diff / min)}m ago`
  if (diff < day) return `${Math.round(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`
  if (diff < 30 * day) return `${Math.round(diff / (7 * day))}w ago`
  return formatDate(iso)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/** "Overdue by 3d" / "Due in 5d" / "Due today". */
export function dueLabel(iso: string, now = Date.now()): { text: string; overdue: boolean } {
  const due = new Date(iso).getTime()
  const days = Math.round((due - now) / 86_400_000)
  if (days < 0) return { text: `Overdue by ${Math.abs(days)}d`, overdue: true }
  if (days === 0) return { text: 'Due today', overdue: false }
  if (days === 1) return { text: 'Due tomorrow', overdue: false }
  return { text: `Due in ${days}d`, overdue: false }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function pct(value: number, total: number): number {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export function titleCase(s: string): string {
  return s.replace(/(^|[\s-])([a-z])/g, (_, p, c) => p + c.toUpperCase())
}
