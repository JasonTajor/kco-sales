import type { PracticeScenario, TrainingActivity } from '@/types'
import { requireDb, unwrap, unwrapMaybe } from '@/lib/supabase'
import type { trainingService as DemoApi } from '../demo/trainingService'
import { rowToActivity, rowToScenario } from '../mappers'
import { logActivity } from './activity'

/**
 * Training activities and practice scenarios (§20, §21).
 *
 * Both tables carry a status column and RLS restricts a learner to published
 * rows, so nothing here has to filter for visibility.
 */
/**
 * A slug that does not collide with one already in the table.
 *
 * Both tables declare slug unique, so a second "Objection Battle" would fail
 * the insert with a constraint violation the admin cannot act on.
 */
async function uniqueSlug(
  table: 'training_activities' | 'practice_scenarios',
  title: string,
): Promise<string> {
  const db = requireDb()
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'

  const rows = unwrap(await db.from(table).select('slug').like('slug', `${base}%`))
  const taken = new Set(rows.map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let n = 2; n < 200; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
  }
  return `${base}-${Date.now().toString(36)}`
}

const DIFFICULTIES = ['foundation', 'intermediate', 'advanced'] as const
const isDifficulty = (v: string): v is (typeof DIFFICULTIES)[number] =>
  (DIFFICULTIES as readonly string[]).includes(v)

export const trainingService: typeof DemoApi = {
  async activities(search = '', difficulty: string = 'all'): Promise<TrainingActivity[]> {
    const db = requireDb()

    let q = db.from('training_activities').select('*').order('title')
    // Narrowed rather than cast: the value comes from a <select>, so an
    // unexpected string should be ignored instead of sent to Postgres as an
    // invalid enum literal.
    if (isDifficulty(difficulty)) q = q.eq('difficulty', difficulty)

    const safe = search.trim().replace(/[,()*]/g, ' ').trim()
    if (safe) q = q.or(`title.ilike.%${safe}%,objective.ilike.%${safe}%`)

    return unwrap(await q).map(rowToActivity)
  },

  async activity(idOrSlug: string): Promise<TrainingActivity | null> {
    const db = requireDb()
    const column = /^[0-9a-f-]{36}$/i.test(idOrSlug) ? 'id' : 'slug'
    const row = unwrapMaybe(
      await db.from('training_activities').select('*').eq(column, idOrSlug).maybeSingle(),
    )
    return row ? rowToActivity(row) : null
  },

  async markActivityRun(_actorId: string, activity: TrainingActivity): Promise<void> {
    // An activity is facilitator-led, so "run" is an audit event rather than
    // learner progress - there is no completion state to store per person.
    await logActivity('activity.ran', 'training_activity', activity.id, activity.title)
  },

  async scenarios(
    filters: { channel?: string; personality?: string; search?: string } = {},
  ): Promise<PracticeScenario[]> {
    const db = requireDb()

    let q = db.from('practice_scenarios').select('*').order('title')
    if (filters.channel && filters.channel !== 'all') q = q.eq('channel', filters.channel)
    if (filters.personality && filters.personality !== 'all') {
      q = q.eq('personality', filters.personality)
    }

    const safe = filters.search?.trim().replace(/[,()*]/g, ' ').trim()
    if (safe) q = q.or(`title.ilike.%${safe}%,setup.ilike.%${safe}%`)

    return unwrap(await q).map(rowToScenario)
  },

  /**
   * Creates or updates an activity (§20).
   *
   * Refused by RLS unless the caller holds `training.manage`, so the check is
   * the database's rather than this method's. The slug is set once on create
   * and never rewritten: it is the stable identifier a link or an assignment
   * may already point at.
   */
  async saveActivity(input: Partial<TrainingActivity> & { id?: string }): Promise<TrainingActivity> {
    const db = requireDb()

    const payload = {
      title: input.title?.trim() || 'Untitled activity',
      objective: input.objective ?? '',
      duration_minutes: input.durationMinutes ?? 15,
      participants: input.participants ?? '',
      difficulty: input.difficulty ?? ('foundation' as const),
      instructions: input.instructions ?? [],
      facilitator_notes: input.facilitatorNotes ?? [],
      expected_outcome: input.expectedOutcome ?? '',
      materials: input.materials ?? [],
      tags: input.tags ?? [],
      status: input.status ?? ('draft' as const),
    }

    const row = input.id
      ? unwrap(
          await db
            .from('training_activities')
            .update(payload)
            .eq('id', input.id)
            .select('*')
            .single(),
        )
      : unwrap(
          await db
            .from('training_activities')
            .insert({ ...payload, slug: await uniqueSlug('training_activities', payload.title) })
            .select('*')
            .single(),
        )

    await logActivity(
      input.id ? 'activity.updated' : 'activity.created',
      'training_activity',
      row.id,
      row.title,
    )
    return rowToActivity(row)
  },

  /** Archives rather than deletes (§75): an activity may be assigned. */
  async archiveActivity(id: string): Promise<void> {
    const db = requireDb()
    const res = await db
      .from('training_activities')
      .update({ status: 'archived' })
      .eq('id', id)
      .select('title')
      .single()
    if (res.error) throw new Error(res.error.message)

    await logActivity('activity.archived', 'training_activity', id, res.data.title)
  },

  async saveScenario(input: Partial<PracticeScenario> & { id?: string }): Promise<PracticeScenario> {
    const db = requireDb()

    const payload = {
      title: input.title?.trim() || 'Untitled scenario',
      channel: input.channel ?? 'chat',
      personality: input.personality ?? 'confused',
      difficulty: input.difficulty ?? ('foundation' as const),
      setup: input.setup ?? '',
      goal: input.goal ?? '',
      // jsonb, so a future AI roleplay engine can generate turns at runtime
      // without a migration.
      turns: (input.turns ?? []) as never,
      coaching: input.coaching ?? [],
    }

    const row = input.id
      ? unwrap(
          await db
            .from('practice_scenarios')
            .update(payload)
            .eq('id', input.id)
            .select('*')
            .single(),
        )
      : unwrap(
          await db
            .from('practice_scenarios')
            .insert({ ...payload, slug: await uniqueSlug('practice_scenarios', payload.title) })
            .select('*')
            .single(),
        )

    return rowToScenario(row)
  },

  async scenario(slug: string): Promise<PracticeScenario | null> {
    const db = requireDb()
    const row = unwrapMaybe(
      await db.from('practice_scenarios').select('*').eq('slug', slug).maybeSingle(),
    )
    return row ? rowToScenario(row) : null
  },
}
