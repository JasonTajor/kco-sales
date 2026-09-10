import * as RAvatar from '@radix-ui/react-avatar'
import { initials } from '@/lib/format'
import { cn } from '@/lib/cn'

const sizes = {
  xs: 'size-5 text-2xs',
  sm: 'size-6 text-2xs',
  md: 'size-7 text-xs',
  lg: 'size-9 text-sm',
  xl: 'size-12 text-lg',
}

/**
 * The felted cast in `public/avatars`. Nobody on the team has uploaded a photo,
 * and a grid of coloured initials reads as a spreadsheet - so each person is
 * given one of these instead, picked by name so it never changes between
 * sessions. A real `src` always wins, and initials remain the last resort if an
 * image fails to load.
 */
const PORTRAITS = [
  '/avatars/felt-1.webp',
  '/avatars/felt-2.webp',
  '/avatars/felt-3.webp',
  '/avatars/felt-4.webp',
  '/avatars/felt-5.webp',
  '/avatars/felt-6.webp',
  '/avatars/felt-7.webp',
]

/** Deterministic hash per person, so hue and portrait stay put. */
function hashFor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 100000
  return h
}

export function Avatar({
  name,
  src,
  size = 'md',
  portrait = true,
  className,
}: {
  name: string
  src?: string
  size?: keyof typeof sizes
  /** Set false where a plain monogram is wanted instead of a portrait. */
  portrait?: boolean
  className?: string
}) {
  const hash = hashFor(name)
  const hue = hash % 360
  const image = src ?? (portrait ? PORTRAITS[hash % PORTRAITS.length] : undefined)
  return (
    <RAvatar.Root
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium',
        sizes[size],
        className,
      )}
    >
      {image && <RAvatar.Image src={image} alt="" className="size-full object-cover" />}
      <RAvatar.Fallback
        className="flex size-full items-center justify-center"
        style={{
          backgroundColor: `oklch(0.92 0.045 ${hue})`,
          color: `oklch(0.42 0.09 ${hue})`,
        }}
      >
        {initials(name)}
      </RAvatar.Fallback>
    </RAvatar.Root>
  )
}
