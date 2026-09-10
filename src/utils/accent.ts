import type { Category } from '@/types'
import type { TileTone } from '@/components/common/EmojiTile'

export type Accent = Category['accent']

/**
 * Category colour, drawn from the KCO product range so the platform reads as
 * the same brand as the packs: Classic green, Cheese orange, Sour Cream deep
 * green, Ube purple, Chili red, and a neutral.
 *
 * Accents are identity only. Every surface that uses one also shows a label,
 * so colour is never the sole carrier of meaning.
 */
const accents: Record<Accent, { chip: string; dot: string; text: string; ring: string; tile: TileTone }> = {
  // Classic - the hero pack
  green: {
    chip: 'border-2 border-[color-mix(in_oklab,var(--flav-classic)_38%,transparent)] bg-[color-mix(in_oklab,var(--flav-classic)_16%,transparent)] text-[var(--flav-sourcream)] dark:text-[var(--flav-classic)]',
    dot: 'bg-[var(--flav-classic)]',
    text: 'text-[var(--flav-sourcream)] dark:text-[var(--flav-classic)]',
    ring: 'ring-[color-mix(in_oklab,var(--flav-classic)_35%,transparent)]',
    tile: 'classic',
  },
  // Original - deep blue pack
  blue: {
    chip: 'border-2 border-[color-mix(in_oklab,var(--flav-lightblue)_38%,transparent)] bg-[color-mix(in_oklab,var(--flav-lightblue)_16%,transparent)] text-[var(--flav-original)] dark:text-[var(--flav-lightblue)]',
    dot: 'bg-[var(--flav-lightblue)]',
    text: 'text-[var(--flav-original)] dark:text-[var(--flav-lightblue)]',
    ring: 'ring-[color-mix(in_oklab,var(--flav-lightblue)_35%,transparent)]',
    tile: 'lightblue',
  },
  // Cheese
  amber: {
    chip: 'border-2 border-[color-mix(in_oklab,var(--flav-cheese)_38%,transparent)] bg-[color-mix(in_oklab,var(--flav-cheese)_18%,transparent)] text-[var(--flav-chocolate)] dark:text-[var(--flav-cheese)]',
    dot: 'bg-[var(--flav-cheese)]',
    text: 'text-[var(--flav-chocolate)] dark:text-[var(--flav-cheese)]',
    ring: 'ring-[color-mix(in_oklab,var(--flav-cheese)_35%,transparent)]',
    tile: 'cheese',
  },
  // Ube
  violet: {
    chip: 'border-2 border-[color-mix(in_oklab,var(--flav-ube)_38%,transparent)] bg-[color-mix(in_oklab,var(--flav-ube)_14%,transparent)] text-[var(--flav-ube)]',
    dot: 'bg-[var(--flav-ube)]',
    text: 'text-[var(--flav-ube)]',
    ring: 'ring-[color-mix(in_oklab,var(--flav-ube)_35%,transparent)]',
    tile: 'ube',
  },
  // Chili
  rose: {
    chip: 'border-2 border-[color-mix(in_oklab,var(--flav-chili)_38%,transparent)] bg-[color-mix(in_oklab,var(--flav-chili)_14%,transparent)] text-[var(--flav-chili)]',
    dot: 'bg-[var(--flav-chili)]',
    text: 'text-[var(--flav-chili)]',
    ring: 'ring-[color-mix(in_oklab,var(--flav-chili)_35%,transparent)]',
    tile: 'chili',
  },
  slate: {
    chip: 'border-2 border-line-chunk bg-neutral-subtle text-neutral-fg',
    dot: 'bg-fg-tertiary',
    text: 'text-fg-secondary',
    ring: 'ring-fg-tertiary/25',
    tile: 'neutral',
  },
}

export function categoryAccent(accent: Accent = 'slate') {
  return accents[accent] ?? accents.slate
}
