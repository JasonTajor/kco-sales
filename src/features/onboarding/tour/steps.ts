import type { EmojiName } from '@/data/emoji'
import type { TileTone } from '@/components/common/EmojiTile'

export interface TourStep {
  id: string
  /** Anchor in the page. Steps whose anchor is absent are skipped, not faked. */
  selector: string
  /** Used below `lg`, where the sidebar is a drawer and not on screen. */
  mobileSelector?: string
  title: string
  body: string
  emoji: EmojiName
  tone: TileTone
}

/**
 * Five steps, ordered as a shift rather than as a feature list: why the work
 * pays, what today asks of you, where to start, what to reach for mid-call,
 * and how to find anything. Each one points at something real on the
 * dashboard, so the tour is the app rather than a slideshow of it.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'rewards',
    selector: '[data-tour="rewards"]',
    title: 'Everything you finish pays',
    body: 'Sections, scenarios and assessments all award XP, which builds your level and your streak. Nothing here is decoration - the numbers come from work you actually completed.',
    emoji: 'xp',
    tone: 'cheese',
  },
  {
    id: 'goal',
    selector: '[data-tour="goal"]',
    title: 'This is today, in one card',
    body: 'Your daily goal is the commitment you just picked. Hit it and the streak holds; the bar fills as you read.',
    emoji: 'goal',
    tone: 'primary',
  },
  {
    id: 'next',
    selector: '[data-tour="next"]',
    title: 'Never wonder what is next',
    body: 'Your path always shows the one thing to do now. Start here and work down - it is ordered for a reason.',
    emoji: 'flag',
    tone: 'ube',
  },
  {
    id: 'resources',
    selector: '[data-tour="resources"]',
    mobileSelector: '[data-tour="mobile-reference"]',
    title: 'Open these mid-call',
    body: 'Etiquette, objections and closing lines live here, written to be skimmed while a customer is talking. This is the part you will use every shift.',
    emoji: 'bolt',
    tone: 'lightblue',
  },
  {
    id: 'search',
    selector: '[data-tour="search"]',
    title: 'Find anything in two keystrokes',
    body: 'Press Ctrl K - or Cmd K on a Mac - from anywhere to jump to a module, a script or a scenario without hunting through the menu.',
    emoji: 'sparkles',
    tone: 'achievement',
  },
]
