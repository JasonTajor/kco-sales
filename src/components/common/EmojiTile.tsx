import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Emoji, type EmojiProps } from './Emoji'

/**
 * The solid block an emoji or icon sits on.
 *
 * Every icon container in the app is one of these: a flat palette face with an
 * offset lip underneath, matching the chunky CTA. Nothing is tinted or
 * translucent, so the artwork always reads against a known colour.
 */
export type TileTone =
  | 'primary'
  | 'classic'
  | 'lightblue'
  | 'cheese'
  | 'ube'
  | 'chili'
  | 'original'
  | 'sourcream'
  | 'achievement'
  | 'locked'
  | 'neutral'

/** Face colours, drawn from the KCO pack palette. */
export const TILE_TONE: Record<TileTone, string> = {
  primary: '[--tile-base:var(--primary)]',
  classic: '[--tile-base:var(--flav-classic)]',
  lightblue: '[--tile-base:var(--flav-lightblue)]',
  cheese: '[--tile-base:var(--flav-cheese)]',
  ube: '[--tile-base:var(--flav-ube)]',
  chili: '[--tile-base:var(--flav-chili)]',
  original: '[--tile-base:var(--flav-original)]',
  sourcream: '[--tile-base:var(--flav-sourcream)]',
  achievement: '[--tile-base:var(--achievement)]',
  locked: '[--tile-base:var(--locked)]',
  neutral: '[--tile-base:var(--locked)]',
}

/** Tile edge lengths, with the emoji sized to leave a comfortable margin. */
const sizes = {
  xs: { box: 'size-7 rounded-md', emoji: 17 },
  sm: { box: 'size-8 rounded-lg', emoji: 20 },
  md: { box: 'size-10 rounded-lg', emoji: 25 },
  lg: { box: 'size-12 rounded-xl', emoji: 30 },
  xl: { box: 'size-16 rounded-2xl', emoji: 40 },
} as const

export type TileSize = keyof typeof sizes

export interface EmojiTileProps extends Omit<EmojiProps, 'size' | 'className'> {
  tone?: TileTone
  size?: TileSize
  /**
   * `soft` is a pale face with the saturated hue on the lip - the default,
   * because full-colour artwork needs a light ground to read against. `solid`
   * fills the face with the hue itself, for white glyphs and letters.
   */
  face?: 'soft' | 'solid'
  className?: string
}

export function EmojiTile({
  tone = 'primary',
  size = 'sm',
  face = 'soft',
  className,
  ...emoji
}: EmojiTileProps) {
  const s = sizes[size]
  return (
    <span className={cn('tile-chunky', s.box, TILE_TONE[tone], className)} data-face={face}>
      <Emoji {...emoji} size={s.emoji} />
    </span>
  )
}

/** The same block, for the places that still carry a Lucide glyph. */
export function IconTile({
  tone = 'primary',
  size = 'sm',
  face = 'solid',
  className,
  children,
}: {
  tone?: TileTone
  size?: TileSize
  face?: 'soft' | 'solid'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn('tile-chunky', sizes[size].box, TILE_TONE[tone], className)}
      data-face={face}
      aria-hidden
    >
      {children}
    </span>
  )
}
