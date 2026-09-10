import type {
  Achievement,
  AchievementId,
  AssessmentAttempt,
  DailyGoal,
  LearningPath,
  LevelInfo,
  Material,
  MaterialProgress,
  PathNode,
  PathUnit,
  StreakInfo,
  XpEvent,
} from '@/types'
import type { EmojiName } from '@/data/emoji'

/**
 * The reward layer, as pure functions.
 *
 * Nothing here is stored and nothing here touches a backend. Every value is
 * computed from progress records and assessment attempts that the service
 * layer already fetched, which has three consequences worth stating:
 *
 *  - XP can never disagree with the work the learner actually did. There is no
 *    second ledger to drift.
 *  - The same code produces the same numbers whether the records came from
 *    Supabase or the offline demo store, so there is one implementation
 *    instead of two that have to be kept in step.
 *  - None of it pulls the demo store into the bundle. An earlier version read
 *    `db` directly, which meant a Supabase-backed app computed a learner's
 *    level from seeded sample data - wrong, and it shipped ~230 kB of content
 *    to do it.
 */

/** A section is the atomic unit of work, so it is the atomic unit of XP. */
export const XP_PER_SECTION = 10
export const XP_MATERIAL_BONUS = 25
export const XP_ASSESSMENT_PASS = 50
export const XP_PER_SCENARIO = 15

/** Minutes of study that count as a day's work. */
export const DAILY_GOAL_MINUTES = 15

const DAY = 86_400_000

/** Everything the reward layer needs, and nothing more. */
export interface RewardInput {
  progress: MaterialProgress[]
  attempts: AssessmentAttempt[]
  materials: Material[]
  paths: LearningPath[]
  /** Titles for the XP feed, keyed by assessment id. */
  assessmentTitles?: Map<string, string>
}

/* ---------------------------------------------------------------- levels --- */

const LEVEL_TITLES = [
  'Trainee',
  'Junior Agent',
  'Agent',
  'Senior Agent',
  'Closer',
  'Senior Closer',
  'Team Lead',
  'Sales Coach',
  'Sales Master',
] as const

/**
 * Cumulative XP needed to reach a level.
 *
 * Deliberately widening: the first levels arrive quickly so a new hire sees
 * movement in their first session, then slow down so a high level still means
 * something a month later.
 */
function levelThreshold(level: number): number {
  return level * (level + 1) * 25 + (level > 0 ? level * 25 : 0)
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 0
  while (level < LEVEL_TITLES.length - 1 && totalXp >= levelThreshold(level + 1)) level++

  const floor = levelThreshold(level)
  const ceiling = levelThreshold(level + 1)
  const span = Math.max(1, ceiling - floor)
  const into = Math.max(0, totalXp - floor)
  const capped = level === LEVEL_TITLES.length - 1

  return {
    level: level + 1,
    title: LEVEL_TITLES[level] ?? 'Sales Master',
    xpIntoLevel: into,
    xpForNextLevel: span,
    totalXp,
    percent: capped ? 100 : Math.round((into / span) * 100),
  }
}

export function totalXp({ progress, attempts }: Pick<RewardInput, 'progress' | 'attempts'>): number {
  const sections = progress.reduce((n, p) => n + p.completedSectionIds.length * XP_PER_SECTION, 0)
  const materials = progress.filter((p) => p.state === 'completed').length * XP_MATERIAL_BONUS
  const passes = attempts.filter((a) => a.passed).length * XP_ASSESSMENT_PASS
  return sections + materials + passes
}

/** XP a material is worth in full - used for the "still on the table" hint. */
export function xpForMaterial(material: Material): number {
  return material.sections.length * XP_PER_SECTION + XP_MATERIAL_BONUS
}

/** XP still available on a material the learner has not finished. */
export function pendingXp(material: Material, progress?: MaterialProgress): number {
  if (progress?.state === 'completed') return 0
  const done = progress?.completedSectionIds.length ?? 0
  return Math.max(0, material.sections.length - done) * XP_PER_SECTION + XP_MATERIAL_BONUS
}

/* --------------------------------------------------------------- streaks --- */

const dayOf = (iso: string) => iso.slice(0, 10)

function activeDays({ progress, attempts }: Pick<RewardInput, 'progress' | 'attempts'>): Set<string> {
  const days = new Set<string>()
  progress.forEach((p) => {
    if (p.lastViewedAt) days.add(dayOf(p.lastViewedAt))
    if (p.completedAt) days.add(dayOf(p.completedAt))
  })
  attempts.forEach((a) => days.add(dayOf(a.submittedAt)))
  return days
}

export function streakFrom(input: Pick<RewardInput, 'progress' | 'attempts'>): StreakInfo {
  const days = activeDays(input)
  const now = Date.now()
  const todayKey = new Date(now).toISOString().slice(0, 10)

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * DAY)
    return {
      day: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      active: days.has(d.toISOString().slice(0, 10)),
    }
  })

  // A streak survives today being empty until midnight, so counting starts at
  // yesterday when nothing has happened yet.
  const activeToday = days.has(todayKey)
  let current = 0
  for (let i = activeToday ? 0 : 1; i < 400; i++) {
    if (!days.has(new Date(now - i * DAY).toISOString().slice(0, 10))) break
    current++
  }

  let longest = 0
  let run = 0
  let previous: number | null = null
  ;[...days].sort().forEach((key) => {
    const t = new Date(key).getTime()
    run = previous !== null && t - previous === DAY ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = t
  })

  return { current, longest: Math.max(longest, current), activeToday, week }
}

/**
 * `target` is the learner's own commitment, chosen during first-run setup.
 * DAILY_GOAL_MINUTES is the fallback for anyone who skipped it, so the survey
 * answer is the only thing that decides what "met" means for them.
 */
export function goalFrom(
  { progress, materials }: Pick<RewardInput, 'progress' | 'materials'>,
  target: number = DAILY_GOAL_MINUTES,
): DailyGoal {
  const today = new Date().toISOString().slice(0, 10)

  // Minutes are attributed from the materials touched today, pro-rated by
  // section, so the figure reflects real reading rather than a flat guess.
  const earned = progress
    .filter((p) => p.lastViewedAt?.slice(0, 10) === today)
    .reduce((sum, p) => {
      const material = materials.find((m) => m.id === p.materialId)
      if (!material || material.sections.length === 0) return sum
      const perSection = material.duration / material.sections.length
      return sum + Math.round(perSection * Math.max(1, p.completedSectionIds.length))
    }, 0)

  const goal = Math.max(1, target)
  const capped = Math.min(earned, goal * 3)
  return {
    targetMinutes: goal,
    earnedMinutes: capped,
    percent: Math.min(100, Math.round((capped / goal) * 100)),
    met: capped >= goal,
  }
}

/* ---------------------------------------------------------- achievements --- */

interface Spec {
  id: AchievementId
  title: string
  description: string
  icon: EmojiName
  hint: string
  /** 0-100. 100 means unlocked. */
  progress: (input: RewardInput) => number
}

const SPECS: Spec[] = [
  {
    id: 'first-lesson',
    title: 'First steps',
    description: 'Complete your first section.',
    icon: 'footprints',
    hint: 'Open any material and tick off a section.',
    progress: ({ progress }) => (progress.some((p) => p.completedSectionIds.length > 0) ? 100 : 0),
  },
  {
    id: 'first-module',
    title: 'Module complete',
    description: 'Finish a whole material.',
    icon: 'books',
    hint: 'Complete every section of one material.',
    progress: ({ progress }) => (progress.some((p) => p.state === 'completed') ? 100 : 0),
  },
  {
    id: 'streak-3',
    title: 'Three in a row',
    description: 'Learn on three consecutive days.',
    icon: 'streak',
    hint: 'Come back tomorrow to keep it going.',
    progress: (input) => Math.min(100, Math.round((streakFrom(input).current / 3) * 100)),
  },
  {
    id: 'streak-7',
    title: 'Full week',
    description: 'Learn every day for a week.',
    icon: 'clover',
    hint: 'Seven days without a gap.',
    progress: (input) => Math.min(100, Math.round((streakFrom(input).current / 7) * 100)),
  },
  {
    id: 'objection-master',
    title: 'Objection master',
    description: 'Complete the Objection Handling material.',
    icon: 'muscle',
    hint: 'Work through all twelve objections.',
    progress: ({ progress, materials }) => {
      const material = materials.find((m) => m.slug === 'objection-handling')
      if (!material || material.sections.length === 0) return 0
      const p = progress.find((x) => x.materialId === material.id)
      if (!p) return 0
      return Math.round((p.completedSectionIds.length / material.sections.length) * 100)
    },
  },
  {
    id: 'perfect-score',
    title: 'Perfect score',
    description: 'Score 100% on any assessment.',
    icon: 'perfect',
    hint: 'Every question right, in one attempt.',
    progress: ({ attempts }) => (attempts.some((a) => a.score === 100) ? 100 : 0),
  },
  {
    id: 'phone-certified',
    title: 'Phone certified',
    description: 'Pass a phone assessment.',
    icon: 'callMe',
    hint: 'Reach the passing score on the phone assessment.',
    progress: ({ attempts, assessmentTitles }) =>
      attempts.some(
        (a) => a.passed && (assessmentTitles?.get(a.assessmentId) ?? '').toLowerCase().includes('phone'),
      )
        ? 100
        : 0,
  },
  {
    id: 'chat-certified',
    title: 'Chat certified',
    description: 'Pass a chat support assessment.',
    icon: 'chat',
    hint: 'Reach the passing score on a chat assessment.',
    progress: ({ attempts, assessmentTitles }) =>
      attempts.some(
        (a) => a.passed && (assessmentTitles?.get(a.assessmentId) ?? '').toLowerCase().includes('chat'),
      )
        ? 100
        : 0,
  },
  {
    id: 'practice-regular',
    title: 'Practice regular',
    description: 'Run five practice scenarios.',
    icon: 'theater',
    hint: 'Scenarios are in Training - Practice.',
    // Scenario runs are recorded in `scenario_runs`, which the learner
    // dashboard does not fetch yet. Reported as 0 rather than guessed at.
    progress: () => 0,
  },
  {
    id: 'library-half',
    title: 'Halfway there',
    description: 'Complete half the library.',
    icon: 'grad',
    hint: 'Keep going - every material counts.',
    progress: ({ progress, materials }) => {
      const published = materials.filter((m) => m.status === 'published')
      if (published.length === 0) return 0
      const done = progress.filter((p) => p.state === 'completed').length
      return Math.min(100, Math.round((done / (published.length / 2)) * 100))
    },
  },
]

function lastActivity(input: RewardInput): string {
  const stamps = [
    ...input.progress.map((p) => p.lastViewedAt ?? p.startedAt),
    ...input.attempts.map((a) => a.submittedAt),
  ].filter((s): s is string => Boolean(s))
  return stamps.sort().at(-1) ?? new Date().toISOString()
}

export function achievementsFrom(input: RewardInput): Achievement[] {
  const at = lastActivity(input)

  return SPECS.map<Achievement>((spec) => {
    const percent = Math.max(0, Math.min(100, spec.progress(input)))
    return {
      id: spec.id,
      title: spec.title,
      description: spec.description,
      icon: spec.icon,
      percent,
      // Derived, so there is no stored unlock date - the most recent piece of
      // qualifying work is the honest answer.
      unlockedAt: percent >= 100 ? at : undefined,
      hint: spec.hint,
    }
  })
}

/* ------------------------------------------------------------- XP events --- */

export function recentXpFrom(input: RewardInput, limit = 6): XpEvent[] {
  const events: XpEvent[] = []

  input.progress
    .filter((p) => p.completedSectionIds.length > 0)
    .forEach((p) => {
      const material = input.materials.find((m) => m.id === p.materialId)
      if (!material) return

      if (p.state === 'completed' && p.completedAt) {
        events.push({
          id: `xp-mat-${p.materialId}`,
          label: `${material.title} complete`,
          amount: XP_MATERIAL_BONUS + material.sections.length * XP_PER_SECTION,
          at: p.completedAt,
          kind: 'material',
        })
      } else if (p.lastViewedAt) {
        events.push({
          id: `xp-sec-${p.materialId}`,
          label: `${p.completedSectionIds.length} sections of ${material.title}`,
          amount: p.completedSectionIds.length * XP_PER_SECTION,
          at: p.lastViewedAt,
          kind: 'section',
        })
      }
    })

  input.attempts
    .filter((a) => a.passed)
    .forEach((a) => {
      events.push({
        id: `xp-asm-${a.id}`,
        label: `Passed ${input.assessmentTitles?.get(a.assessmentId) ?? 'an assessment'}`,
        amount: XP_ASSESSMENT_PASS,
        at: a.submittedAt,
        kind: 'assessment',
      })
    })

  return events.sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit)
}

/* -------------------------------------------------------------- the path --- */

/**
 * Groups the published paths into units for the journey view.
 *
 * A node is `locked` only when the unit before it is unfinished. That is a
 * presentation of suggested order, not access control - any published material
 * is reachable directly from the library, and the database would not refuse
 * it. Locking is how the path says "this one first".
 */
export function buildUnits(input: RewardInput): PathUnit[] {
  const progressFor = (materialId: string) => input.progress.find((p) => p.materialId === materialId)

  let previousComplete = true

  return input.paths
    .filter((p) => p.status === 'published')
    .map<PathUnit>((path, unitIndex) => {
      const nodes: PathNode[] = path.materialIds
        .map((id) => input.materials.find((m) => m.id === id))
        .filter((m): m is Material => Boolean(m))
        .map<PathNode>((material) => {
          const p = progressFor(material.id)
          const sectionsDone = p?.completedSectionIds.length ?? 0

          return {
            id: `node-${path.slug}-${material.slug}`,
            materialId: material.id,
            slug: material.slug,
            title: material.title,
            kind: 'lesson',
            state:
              p?.state === 'completed'
                ? 'completed'
                : sectionsDone > 0
                  ? 'current'
                  : previousComplete
                    ? 'available'
                    : 'locked',
            xp: xpForMaterial(material),
            durationMinutes: material.duration,
            sectionsDone,
            sectionsTotal: material.sections.length,
          }
        })

      const allDone = nodes.length > 0 && nodes.every((n) => n.state === 'completed')
      const anyStarted = nodes.some((n) => n.state === 'current' || n.state === 'completed')

      const unit: PathUnit = {
        id: path.id,
        index: unitIndex + 1,
        title: path.title,
        summary: path.description,
        nodes,
        state: allDone ? 'completed' : previousComplete || anyStarted ? 'current' : 'locked',
      }

      previousComplete = allDone
      return unit
    })
}
