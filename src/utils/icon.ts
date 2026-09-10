import { EMOJI, type EmojiName } from '@/data/emoji'

/**
 * Resolves the icon string stored on a `Category` to an animated emoji.
 *
 * Categories used to store a Lucide component name. Those names still resolve,
 * so a category saved before the switch keeps a sensible face.
 */
const legacy: Record<string, EmojiName> = {
  Phone: 'speaking',
  MessageSquare: 'chat',
  GitBranch: 'finish',
  ShieldQuestion: 'muscle',
  Users: 'grad',
  Bookmark: 'bolt',
}

export function categoryEmoji(name: string): EmojiName {
  if (name in EMOJI) return name as EmojiName
  return legacy[name] ?? 'books'
}
