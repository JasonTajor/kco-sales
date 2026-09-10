import type { PracticeScenario, TrainingActivity } from '@/types'
import { delay } from '@/lib/delay'
import { uid } from '@/lib/id'
import { db, logActivity, persist } from '../store'

/** A url-safe slug that does not collide with one already in use. */
function slugify(title: string, taken: string[]): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'

  if (!taken.includes(base)) return base
  for (let n = 2; n < 200; n++) {
    if (!taken.includes(`${base}-${n}`)) return `${base}-${n}`
  }
  return `${base}-${Date.now().toString(36)}`
}

export const trainingService = {
  async activities(search = '', difficulty: string = 'all'): Promise<TrainingActivity[]> {
    const q = search.trim().toLowerCase()
    return delay(
      db.activities.filter((a) => {
        if (difficulty !== 'all' && a.difficulty !== difficulty) return false
        if (!q) return true
        return (
          a.title.toLowerCase().includes(q) ||
          a.objective.toLowerCase().includes(q) ||
          a.tags.some((t) => t.includes(q))
        )
      }),
    )
  },

  async activity(idOrSlug: string): Promise<TrainingActivity | null> {
    return delay(db.activities.find((a) => a.id === idOrSlug || a.slug === idOrSlug) ?? null, 150)
  },

  async markActivityRun(actorId: string, activity: TrainingActivity): Promise<void> {
    logActivity({ actorId, action: 'activity.ran', targetLabel: activity.title, targetId: activity.id })
    return delay(undefined, 180)
  },

  async scenarios(filters: { channel?: string; personality?: string; search?: string } = {}): Promise<PracticeScenario[]> {
    const q = (filters.search ?? '').trim().toLowerCase()
    return delay(
      db.scenarios.filter((s) => {
        if (filters.channel && filters.channel !== 'all' && s.channel !== filters.channel) return false
        if (filters.personality && filters.personality !== 'all' && s.personality !== filters.personality) return false
        if (!q) return true
        return s.title.toLowerCase().includes(q) || s.setup.toLowerCase().includes(q)
      }),
    )
  },

  /**
   * Creates or updates an activity (§20).
   *
   * A slug is derived from the title on create and never changed afterwards -
   * it is the stable identifier a link or an assignment may already point at,
   * so renaming an activity must not break either.
   */
  async saveActivity(input: Partial<TrainingActivity> & { id?: string }): Promise<TrainingActivity> {
    const existing = input.id ? db.activities.find((a) => a.id === input.id) : undefined

    if (existing) {
      Object.assign(existing, input, { slug: existing.slug })
      persist('activities', db.activities)
      return delay(existing, 200)
    }

    const title = input.title?.trim() || 'Untitled activity'
    const created: TrainingActivity = {
      id: uid('act'),
      slug: slugify(title, db.activities.map((a) => a.slug)),
      title,
      objective: input.objective ?? '',
      durationMinutes: input.durationMinutes ?? 15,
      participants: input.participants ?? '',
      difficulty: input.difficulty ?? 'foundation',
      instructions: input.instructions ?? [],
      facilitatorNotes: input.facilitatorNotes ?? [],
      expectedOutcome: input.expectedOutcome ?? '',
      materials: input.materials,
      tags: input.tags ?? [],
      status: input.status ?? 'draft',
    }

    db.activities.unshift(created)
    persist('activities', db.activities)
    return delay(created, 240)
  },

  /** Archives rather than deletes (§75): an activity may be assigned. */
  async archiveActivity(id: string): Promise<void> {
    const activity = db.activities.find((a) => a.id === id)
    if (!activity) throw new Error('Activity not found')
    activity.status = 'archived'
    persist('activities', db.activities)
    return delay(undefined, 180)
  },

  async saveScenario(input: Partial<PracticeScenario> & { id?: string }): Promise<PracticeScenario> {
    const existing = input.id ? db.scenarios.find((s) => s.id === input.id) : undefined

    if (existing) {
      Object.assign(existing, input, { slug: existing.slug })
      persist('scenarios', db.scenarios)
      return delay(existing, 200)
    }

    const title = input.title?.trim() || 'Untitled scenario'
    const created: PracticeScenario = {
      id: uid('scn'),
      slug: slugify(title, db.scenarios.map((s) => s.slug)),
      title,
      channel: input.channel ?? 'chat',
      personality: input.personality ?? 'confused',
      difficulty: input.difficulty ?? 'foundation',
      setup: input.setup ?? '',
      goal: input.goal ?? '',
      turns: input.turns ?? [],
      coaching: input.coaching ?? [],
    }

    db.scenarios.unshift(created)
    persist('scenarios', db.scenarios)
    return delay(created, 240)
  },

  async scenario(slug: string): Promise<PracticeScenario | null> {
    return delay(db.scenarios.find((s) => s.slug === slug) ?? null, 150)
  },
}
