import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Each tone supplies its face; `.face-chunky` derives the lip. Neutral is a
 * light face with ink type - a charcoal chip is far too heavy for the most
 * common badge on the page. The green and amber faces are darkened within
 * their own hue, since neither can carry white type at full brightness.
 */
const tones: Record<BadgeTone, string> = {
  neutral: '[--face:var(--neutral-subtle)] [--face-fg:var(--text)] [--face-edge:var(--border-chunk)]',
  primary: '[--face:color-mix(in_oklab,var(--cta)_72%,#000)]',
  success: '[--face:color-mix(in_oklab,var(--cta)_72%,#000)]',
  warning: '[--face:var(--warning-text)]',
  danger: '[--face:var(--danger)]',
  info: '[--face:var(--info)]',
}

const dots: Record<BadgeTone, string> = {
  neutral: 'bg-fg-tertiary',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'face-chunky rounded-lg inline-flex items-center gap-tight px-snug py-hair text-xs font-bold leading-4',
        tones[tone],
        className,
      )}
    >
      {/* Marker inherits the face text colour, so it works light or dark. */}
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current opacity-60" aria-hidden />}
      {children}
    </span>
  )
}

/** Bare label + dot, no fill - used inside dense table rows. */
export function DotLabel({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-tight text-base text-fg">
      <span className={cn('size-1.5 shrink-0 rounded-full', dots[tone])} aria-hidden />
      {children}
    </span>
  )
}
