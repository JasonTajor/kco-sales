import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { duration, easeOut } from '@/lib/motion'

/** Chunky panel: 2px border over a solid bottom lip, so it reads as an object. */
export function Card({
  children,
  className,
  interactive,
  as: As = 'div',
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
  as?: 'div' | 'article' | 'section' | 'li'
}) {
  const reduce = useReducedMotion()

  if (interactive && !reduce) {
    const MotionAs = motion[As]
    return (
      <MotionAs
        className={cn('chunk [--chunk:4px] cursor-pointer', className)}
        whileHover={{ y: -3 }}
        whileTap={{ y: 1, scale: 0.995 }}
        transition={{ duration: duration.instant, ease: easeOut }}
      >
        {children}
      </MotionAs>
    )
  }

  return (
    <As className={cn('chunk [--chunk:4px]', interactive && 'chunk-press cursor-pointer', className)}>
      {children}
    </As>
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    // p-card, not a bespoke px/py pair: this header has to sit on the same
    // left edge as the rows underneath it, whichever page composes them.
    <div className={cn('flex items-start justify-between gap-group border-b-2 border-line p-card', className)}>
      <div className="min-w-0 space-y-hair">
        <h2 className="text-lg font-bold tracking-tight text-fg">{title}</h2>
        {description && <p className="text-sm text-fg-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Section heading used outside cards, where most page content lives. */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    // Half the interval that sits above it (sections stack on space-y-rhythm),
    // so the heading binds forward to its own content, not back to the section
    // before it.
    <div className={cn('mb-group flex items-end justify-between gap-group', className)}>
      <div className="min-w-0 space-y-hair">
        <h2 className="text-xl font-bold tracking-tight text-fg">{title}</h2>
        {description && <p className="text-sm text-fg-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
