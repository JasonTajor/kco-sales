import type { ReactNode } from 'react'
import type { EmojiName } from '@/data/emoji'
import { EmojiTile, type TileTone } from '@/components/common/EmojiTile'
import { cn } from '@/lib/cn'

type Variant = 'info' | 'warning' | 'success' | 'danger'

/**
 * A panel face over a coloured lip - the same construction as `.chunk`, but
 * the lip and the hairline carry the variant at full strength instead of the
 * fill. The face is the solid surface colour, never a wash of the variant, so
 * the text keeps the normal page contrast and nothing shows through.
 *
 * The lip is a box-shadow painted outside the border box and deliberately gets
 * no reserved margin: the callout is usually a direct child of a `space-y-*`
 * stack, and a margin here would out-specify that gap (Tailwind's space
 * utilities are `:where()`, so any margin on the child wins).
 */
const styles: Record<Variant, { edge: string; emoji: EmojiName; tile: TileTone }> = {
  info: { edge: '[--callout-edge:var(--info)]', emoji: 'idea', tile: 'lightblue' },
  warning: { edge: '[--callout-edge:var(--warning)]', emoji: 'warning', tile: 'cheese' },
  success: { edge: '[--callout-edge:var(--success)]', emoji: 'success', tile: 'classic' },
  danger: { edge: '[--callout-edge:var(--danger)]', emoji: 'boom', tile: 'chili' },
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
        'flex gap-snug rounded-xl border border-[var(--callout-edge)] bg-surface p-card',
        'shadow-[0_4px_0_0_var(--callout-edge)]',
        s.edge,
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
