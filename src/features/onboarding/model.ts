import type { EmojiName } from '@/data/emoji'
import type { TileTone } from '@/components/common/EmojiTile'

/**
 * First-run setup for a sales agent.
 *
 * Four questions, and every one of them changes something the learner can see
 * afterwards - the daily goal, the module we open first, the path we point at.
 * A question that only fills a database row does not belong here.
 */

export type Channel = 'phone' | 'chat' | 'both'
export type Experience = 'new' | 'some' | 'seasoned'
export type DailyMinutes = 10 | 20 | 30
export type Focus = 'phone-etiquette' | 'chat-etiquette' | 'objections' | 'closing'

export interface OnboardingAnswers {
  channel: Channel
  experience: Experience
  dailyMinutes: DailyMinutes
  focus: Focus
}

/** Applied when someone skips setup, so the app still behaves sensibly. */
export const DEFAULT_ANSWERS: OnboardingAnswers = {
  channel: 'both',
  experience: 'new',
  dailyMinutes: 20,
  focus: 'phone-etiquette',
}

export interface OnboardingRecord {
  /** ISO timestamp. Absent means setup has never been finished or skipped. */
  completedAt?: string
  /** True when the learner chose to skip rather than answer. */
  skipped?: boolean
  answers?: OnboardingAnswers
  /** ISO timestamp of the guided tour finishing or being dismissed. */
  tourSeenAt?: string
}

/* --------------------------------------------------------------- options --- */

export interface Choice<T> {
  value: T
  label: string
  hint: string
  emoji: EmojiName
  tone: TileTone
}

export interface Question<K extends keyof OnboardingAnswers> {
  key: K
  /** Asked in the learner's own terms, not the data model's. */
  title: string
  description: string
  choices: Choice<OnboardingAnswers[K]>[]
}

export const CHANNEL_QUESTION: Question<'channel'> = {
  key: 'channel',
  title: 'Where do you talk to customers?',
  description: 'We will put the scripts you actually need within one tap.',
  choices: [
    { value: 'phone', label: 'Mostly calls', hint: 'Phone and voice orders', emoji: 'callMe', tone: 'lightblue' },
    { value: 'chat', label: 'Mostly chat', hint: 'Messenger and page replies', emoji: 'chat', tone: 'ube' },
    { value: 'both', label: 'Both', hint: 'Calls and chat, depending on the day', emoji: 'handshake', tone: 'primary' },
  ],
}

export const EXPERIENCE_QUESTION: Question<'experience'> = {
  key: 'experience',
  title: 'How much selling have you done before?',
  description: 'This sets where your path starts. You can always go back to the basics.',
  choices: [
    { value: 'new', label: 'This is my first sales job', hint: 'Start from the fundamentals', emoji: 'seedling', tone: 'classic' },
    { value: 'some', label: 'A little experience', hint: 'A few months somewhere else', emoji: 'footprints', tone: 'cheese' },
    { value: 'seasoned', label: 'I have sold for years', hint: 'Skip ahead to KCO specifics', emoji: 'muscle', tone: 'chili' },
  ],
}

export const MINUTES_QUESTION: Question<'dailyMinutes'> = {
  key: 'dailyMinutes',
  title: 'How long can you train each day?',
  description: 'Be honest. A small goal you keep beats a big one you break.',
  choices: [
    { value: 10, label: '10 minutes', hint: 'One section between calls', emoji: 'clock', tone: 'lightblue' },
    { value: 20, label: '20 minutes', hint: 'A steady daily habit', emoji: 'hourglass', tone: 'primary' },
    { value: 30, label: '30 minutes', hint: 'I want to finish fast', emoji: 'rocket', tone: 'chili' },
  ],
}

export const FOCUS_QUESTION: Question<'focus'> = {
  key: 'focus',
  title: 'What do you want to get better at first?',
  description: 'We will open this one for you when setup is done.',
  choices: [
    { value: 'phone-etiquette', label: 'Sounding right on a call', hint: 'Openings, tone, confirmations', emoji: 'speaking', tone: 'lightblue' },
    { value: 'chat-etiquette', label: 'Replying well in chat', hint: 'Response times and wording', emoji: 'chat', tone: 'ube' },
    { value: 'objections', label: 'Handling "it is too expensive"', hint: 'Twelve objections, one formula', emoji: 'muscle', tone: 'chili' },
    { value: 'closing', label: 'Actually closing the sale', hint: 'Asking without sounding pushy', emoji: 'finish', tone: 'cheese' },
  ],
}

/** Ordered, and typed loosely enough to iterate over in the survey shell. */
export const QUESTIONS = [
  CHANNEL_QUESTION,
  EXPERIENCE_QUESTION,
  MINUTES_QUESTION,
  FOCUS_QUESTION,
] as const

export const STEP_COUNT = QUESTIONS.length

/* ------------------------------------------------------------ derivations -- */

/** XP awarded once, for finishing setup. Small: it is a warm-up, not an achievement. */
export const SETUP_XP = 25

interface Plan {
  /** Material slug to open first. */
  startSlug: string
  startLabel: string
  /** Learning path the dashboard should point at. */
  pathSlug: string
  pathLabel: string
}

const FOCUS_START: Record<Focus, { slug: string; label: string }> = {
  'phone-etiquette': { slug: 'phone-etiquette', label: 'Phone Etiquette' },
  'chat-etiquette': { slug: 'chat-etiquette', label: 'Chat Etiquette' },
  objections: { slug: 'objection-handling', label: 'Objection Handling' },
  closing: { slug: 'sales-call-structure', label: 'Sales Call Structure' },
}

/**
 * The plan the summary screen shows. Focus decides the first module; channel
 * and experience decide which path the learner is pointed at, because a
 * seasoned chat agent and a brand new caller should not land in the same place.
 */
export function planFrom(answers: OnboardingAnswers): Plan {
  const start = FOCUS_START[answers.focus]

  const path =
    answers.experience === 'new'
      ? { slug: 'new-hire-foundation', label: 'New Hire Foundation' }
      : answers.focus === 'objections' || answers.focus === 'closing'
        ? { slug: 'closing-and-objections', label: 'Closing & Objections' }
        : answers.channel === 'chat'
          ? { slug: 'chat-support-specialist', label: 'Chat Support Specialist' }
          : { slug: 'new-hire-foundation', label: 'New Hire Foundation' }

  return { startSlug: start.slug, startLabel: start.label, pathSlug: path.slug, pathLabel: path.label }
}

/** The resource page a learner's channel makes most useful. */
export function resourceFor(channel: Channel): { to: string; label: string } {
  return channel === 'chat'
    ? { to: '/resources/chat-scripts', label: 'Chat Etiquette' }
    : { to: '/resources/phone-scripts', label: 'Phone Etiquette' }
}
