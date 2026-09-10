import type { ReactNode } from 'react'
import type { EmojiName } from '@/data/emoji'
import { EmojiTile, type TileTone } from '@/components/common/EmojiTile'
import { cn } from '@/lib/cn'

type Variant = 'info' | 'warning' | 'success' | 'danger'

/**
 * The face is mixed against the surface rather than using the pale `-subtle`
 * token, so the panel reads as a solid colour instead of a wash. The left bar
 * carries the variant; the remaining edges are a hairline so the bar stays the
 * thing you notice.
 */
const styles: Record<Variant, { wrap: string; emoji: EmojiName; tile: TileTone }> = {
  info: {
    wrap:
      'border-info/25 border-l-info [--face:color-mix(in_oklab,var(--info)_20%,var(--surface))] ' +
      '[--face-edge:color-mix(in_oklab,var(--info)_38%,var(--surface))]',
    emoji: 'idea',
    tile: 'lightblue',
  },
  warning: {
    wrap:
      'border-warning/25 border-l-warning [--face:color-mix(in_oklab,var(--warning)_20%,var(--surface))] ' +
      '[--face-edge:color-mix(in_oklab,var(--warning)_38%,var(--surface))]',
    emoji: 'warning',
    tile: 'cheese',
  },
  success: {
    wrap:
      'border-success/25 border-l-success [--face:color-mix(in_oklab,var(--success)_20%,var(--surface))] ' +
      '[--face-edge:color-mix(in_oklab,var(--success)_38%,var(--surface))]',
    emoji: 'success',
    tile: 'classic',
  },
  danger: {
    wrap:
      'border-danger/25 border-l-danger [--face:color-mix(in_oklab,var(--danger)_20%,var(--surface))] ' +
      '[--face-edge:color-mix(in_oklab,var(--danger)_38%,var(--surface))]',
    emoji: 'boom',
    tile: 'chili',
  },
}

export function Callout({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: Variant
  title?: string
  children: ReactNode
  className?: string
}) {
  const s = styles[variant]
  return (
    <div
      className={cn(
        'face-chunky flex gap-snug rounded-lg border border-l-4 p-card',
        '[--face-fg:var(--text)] [--face-lip:3px]',
        s.wrap,
        className,
      )}
    >
      <EmojiTile name={s.emoji} tone={s.tile} size="sm" className="shrink-0" />
      <div className="min-w-0 space-y-hair pt-px">
        {title && <p className="text-base font-bold text-fg">{title}</p>}
        <div className="text-base leading-relaxed text-fg-secondary">{children}</div>
      </div>
    </div>
  )
}
