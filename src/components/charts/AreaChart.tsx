import { useId, useMemo, useState } from 'react'
import type { SeriesPoint } from '@/services/reportService'
import { cn } from '@/lib/cn'

/**
 * Minimal trend chart. No library - the whole point is that it inherits the
 * theme tokens and stays visually quiet.
 */
export function AreaChart({
  data,
  height = 140,
  className,
  valueLabel = 'events',
}: {
  data: SeriesPoint[]
  height?: number
  className?: string
  valueLabel?: string
}) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)

  const { path, area, max, points } = useMemo(() => {
    const w = 100
    const h = 100
    const max = Math.max(1, ...data.map((d) => d.value))
    const step = data.length > 1 ? w / (data.length - 1) : w

    const points = data.map((d, i) => ({
      x: i * step,
      y: h - (d.value / max) * h * 0.88 - 4,
      ...d,
    }))

    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    const area = `${path} L${w},${h} L0,${h} Z`
    return { path, area, max, points }
  }, [data])

  if (data.length === 0) return null
  const active = hover === null ? null : points[hover]

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full"
        role="img"
        aria-label={`Trend of ${valueLabel} over ${data.length} days, peaking at ${max}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2="100" y1={g * 100} y2={g * 100} stroke="var(--border)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {active && (
          <line
            x1={active.x}
            x2={active.x}
            y1="0"
            y2="100"
            stroke="var(--border-strong)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Hover targets sit above the svg so the tooltip can be plain HTML. */}
      <div className="absolute inset-0 flex" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={`${d.label}-${i}`}
            className="h-full flex-1"
            onMouseEnter={() => setHover(i)}
            aria-hidden
          />
        ))}
      </div>

      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-line bg-surface-raised px-tight py-hair shadow-md"
          style={{ left: `${active.x}%`, top: -4 }}
        >
          <p className="whitespace-nowrap text-2xs text-fg-tertiary">{active.label}</p>
          <p className="whitespace-nowrap text-sm font-semibold text-fg tnum">
            {active.value} {valueLabel}
          </p>
        </div>
      )}

      <div className="mt-tight flex justify-between text-2xs text-fg-tertiary">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}
