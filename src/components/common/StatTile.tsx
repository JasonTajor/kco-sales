import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A headline number is the right "chart" for a single value - no plot, no
 * legend, no colour carrying meaning. The label sits above so the eye lands on
 * the number, and every figure uses tabular figures so a row of tiles aligns.
 */
export function StatTile({
  label,
  value,
  unit,
  hint,
  icon,
  tone = 'neutral',
  className,
}: {
  label: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  icon?: ReactNode
  /** Reserved for genuine state (overdue, at risk) - not decoration. */
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const toneText = {
    neutral: 'text-fg',
    success: 'text-success-fg',
    warning: 'text-warning-fg',
    danger: 'text-danger-fg',
  }[tone]

  return (
    // Label, number, and hint are one block, so one interval binds all three
    // rather than two hand-tuned nudges pulling them apart.
    <div className={cn('chunk space-y-hair p-card', className)}>
      <div className="flex items-center gap-tight">
        {icon && <span className="text-fg-tertiary [&>svg]:size-3.5">{icon}</span>}
        <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">{label}</p>
      </div>
      <p className={cn('flex items-baseline gap-hair text-3xl font-extrabold tracking-[-0.02em] tnum', toneText)}>
        {value}
        {unit && <span className="text-base font-medium text-fg-tertiary">{unit}</span>}
      </p>
      {hint && <p className="text-sm text-fg-secondary">{hint}</p>}
    </div>
  )
}

export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-group sm:grid-cols-2 lg:grid-cols-4', className)}>{children}</div>
  )
}

/** Shared legend for the completion split used on dashboards and reports. */
export function CompletionLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-snug gap-y-hair', className)}>
      {[
        { label: 'Completed', color: 'var(--primary)' },
        { label: 'In progress', color: 'color-mix(in oklab, var(--primary) 45%, var(--bg-inset))' },
        { label: 'Not started', color: 'var(--border-strong)' },
      ].map((s) => (
        <li key={s.label} className="flex items-center gap-tight text-2xs text-fg-tertiary">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

/** The three colours the legend documents, in the order StackedBar expects. */
export const completionColors = {
  completed: 'var(--primary)',
  inProgress: 'color-mix(in oklab, var(--primary) 45%, var(--bg-inset))',
  notStarted: 'var(--border-strong)',
} as const
