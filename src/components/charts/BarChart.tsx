import type { SeriesPoint } from '@/services/reportService'
import { cn } from '@/lib/cn'

/** Vertical bars for small distributions (score bands). */
export function BarChart({
  data,
  height = 120,
  className,
  unit = '',
}: {
  data: SeriesPoint[]
  height?: number
  className?: string
  unit?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className={cn('space-y-tight', className)}>
      <div className="flex items-end gap-tight" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col justify-end gap-tight">
            <span className="text-center text-2xs font-medium text-fg-secondary opacity-0 transition-opacity group-hover:opacity-100 tnum">
              {d.value}
              {unit}
            </span>
            <div
              className="rounded-t-[3px] bg-primary transition-colors group-hover:bg-primary-hover"
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
              role="img"
              aria-label={`${d.label}: ${d.value}${unit}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-tight">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-2xs text-fg-tertiary">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Horizontal segmented bar - completion split across three states. */
export function StackedBar({
  segments,
  className,
  height = 8,
}: {
  segments: { label: string; value: number; color: string }[]
  className?: string
  height?: number
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1

  return (
    <div
      className={cn('flex w-full overflow-hidden rounded-full bg-bg-inset', className)}
      style={{ height }}
      role="img"
      aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}
    >
      {segments.map((s) => (
        <div
          key={s.label}
          className="h-full transition-[width] duration-300"
          style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          title={`${s.label}: ${s.value}`}
        />
      ))}
    </div>
  )
}

export function Sparkline({ values, className, height = 24 }: { values: number[]; className?: string; height?: number }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = 100 / (values.length - 1)
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(100 - ((v - min) / range) * 100).toFixed(1)}`)
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className={cn('w-full', className)} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  )
}
