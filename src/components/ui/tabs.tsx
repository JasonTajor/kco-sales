import * as RTabs from '@radix-ui/react-tabs'
import { motion, useReducedMotion } from 'motion/react'
import { springUI } from '@/lib/motion'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Tabs = RTabs.Root

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RTabs.List
      className={cn(
        'flex items-center gap-hair overflow-x-auto rounded-full bg-bg-inset p-hair no-scrollbar',
        className,
      )}
    >
      {children}
    </RTabs.List>
  )
}

export function TabsTrigger({
  value,
  children,
  count,
}: {
  value: string
  children: ReactNode
  count?: number
}) {
  return (
    <RTabs.Trigger
      value={value}
      className={cn(
        'relative flex shrink-0 items-center gap-tight rounded-full px-snug py-tight text-base font-bold text-fg-secondary',
        'transition-[color,background-color,transform] duration-100 hover:text-fg hover:bg-surface/60',
        'active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2',
        'data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-sm',
      )}
    >
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-neutral-subtle px-tight text-xs font-bold tabular-nums text-fg-secondary">
          {count}
        </span>
      )}
    </RTabs.Trigger>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <RTabs.Content value={value} className={cn('mt-group focus-visible:outline-none', className)}>
      {children}
    </RTabs.Content>
  )
}

/** Compact toggle for view switches (grid/list, light/dark). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode; title?: string }[]
  ariaLabel?: string
  size?: 'sm' | 'md'
}) {
  const reduce = useReducedMotion()
  const indicatorId = useId()
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-0.5 rounded-full border-2 border-line-chunk bg-bg-inset p-hair')}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              // `relative` is load-bearing: the indicator below is `inset-0`,
              // and without a positioned button it stretches to the nearest
              // positioned ancestor and paints over the whole page.
              'relative inline-flex items-center gap-tight rounded-full font-bold transition-colors duration-100',
              size === 'sm' ? 'h-7 px-snug text-xs' : 'h-8 px-card text-sm',
              active
                ? 'bg-surface text-fg shadow-xs'
                : 'text-fg-secondary hover:text-fg',
            )}
          >
            {active && !reduce && (
              <motion.span
                layoutId={indicatorId}
                className="absolute inset-0 rounded-full bg-surface shadow-xs"
                transition={springUI}
                aria-hidden
              />
            )}
            {active && reduce && (
              <span className="absolute inset-0 rounded-full bg-surface shadow-xs" aria-hidden />
            )}
            <span className="relative z-10 inline-flex items-center gap-tight">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
