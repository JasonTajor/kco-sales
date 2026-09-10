import type {
  Assignment,
  LearningPath,
  Material,
  MaterialProgress,
} from '@/types'
import { requireDb, unwrap, unwrapMaybe } from '@/lib/supabase'
import type { LearnerSummary, progressService as DemoApi } from '../demo/progressService'
import { rowToAssignment, rowToMaterial, rowToProgress } from '../mappers'

/**
 * Learner progress (§28).
 *
 * Progress is stored, not recomputed in the browser. Two database features do
 * the heavy lifting:
 *
 *  - `complete_lesson()` writes the lesson row, and an AFTER trigger rolls the
 *    module's state up and closes any matching assignment in the same
 *    transaction. The client cannot leave the two disagreeing.
 *
 *  - `my_progress_summary()` returns the dashboard's counts as one row, rather
 *    than the client fetching every progress record to count them.
 */

/** In-memory mirror of the current user's progress, for synchronous reads. */
const cache = new Map<string, MaterialProgress>()
const key = (userId: string, materialId: string) => `${userId}:${materialId}`

export const progressService: typeof DemoApi = {
  async forUser(userId: string): Promise<MaterialProgress[]> {
    const db = requireDb()

    const [progress, lessons, favorites] = await Promise.all([
      db.from('module_progress').select('*').eq('user_id', userId),
      db.from('lesson_progress').select('lesson_id, module_id').eq('user_id', userId).eq('completed', true),
      db.from('favorites').select('target_id').eq('user_id', userId).eq('target_type', 'module'),
    ])

    const progressRows = unwrap(progress)
    const doneLessons = unwrap(lessons)
    const favIds = new Set(unwrap(favorites).map((f) => f.target_id))

    // Group completed lessons by module so each progress record carries its
    // own list, which is what the viewer's section rail reads.
    const byModule = new Map<string, string[]>()
    doneLessons.forEach((l) => {
      const list = byModule.get(l.module_id) ?? []
      list.push(l.lesson_id)
      byModule.set(l.module_id, list)
    })

    const rows = progressRows.map((r) =>
      rowToProgress(r, byModule.get(r.module_id) ?? [], favIds.has(r.module_id)),
    )

    // Favourited but never opened: there is no module_progress row, yet the
    // UI still needs to know it is a favourite.
    favIds.forEach((moduleId) => {
      if (!rows.some((r) => r.materialId === moduleId)) {
        rows.push({
          userId,
          materialId: moduleId,
          state: 'not-started',
          completedSectionIds: [],
          favorite: true,
        })
      }
    })

    cache.clear()
    rows.forEach((r) => cache.set(key(userId, r.materialId), r))
    return rows
  },

  peek(userId: string, materialId: string): MaterialProgress | undefined {
    return cache.get(key(userId, materialId))
  },

  /**
   * Records that a learner opened a module.
   *
   * Written as a read-then-upsert against `module_progress` rather than
   * through the `touch_module_view` RPC.
   *
   * The reason is deliberate. That function shipped with an uncast enum in its
   * ON CONFLICT clause and returned 42804 on every call, which made opening
   * any module fail - and because `openMaterial` throws, the whole page fell
   * back to its error state. Doing the work here means the app does not depend
   * on a database function being patched before a learner can read a lesson.
   *
   * Nothing is lost by moving it: the `module_progress_own` policy already
   * grants a learner full access to their own progress rows, so the function
   * was a convenience rather than an enforcement point. The one rule it
   * carried - viewing must never demote a completed module - is preserved
   * below, and the worst a client could do by lying about it is understate
   * their own progress.
   */
  async openMaterial(userId: string, materialId: string, sectionId?: string): Promise<MaterialProgress> {
    const db = requireDb()
    const now = new Date().toISOString()

    // Read first: `started_at` must survive (it answers "when did you begin"),
    // and the last viewed lesson must not be cleared when the module is opened
    // without naming one.
    const current = unwrapMaybe(
      await db
        .from('module_progress')
        .select('state, started_at, last_viewed_lesson_id')
        .eq('user_id', userId)
        .eq('module_id', materialId)
        .maybeSingle(),
    )

    const res = await db.from('module_progress').upsert(
      {
        user_id: userId,
        module_id: materialId,
        state: current?.state === 'completed' ? 'completed' : 'in-progress',
        started_at: current?.started_at ?? now,
        last_viewed_at: now,
        last_viewed_lesson_id: sectionId ?? current?.last_viewed_lesson_id ?? null,
      },
      { onConflict: 'user_id,module_id' },
    )
    if (res.error) throw new Error(res.error.message)

    return refresh(userId, materialId)
  },

  async toggleSection(userId: string, material: Material, sectionId: string): Promise<MaterialProgress> {
    const db = requireDb()

    const current = cache.get(key(userId, material.id))
    const wasComplete = current?.completedSectionIds.includes(sectionId) ?? false

    const res = await db.rpc('complete_lesson', {
      p_lesson_id: sectionId,
      p_completed: !wasComplete,
    })
    if (res.error) throw new Error(res.error.message)

    return refresh(userId, material.id)
  },

  async toggleFavorite(userId: string, materialId: string): Promise<MaterialProgress> {
    const db = requireDb()
    const current = cache.get(key(userId, materialId))

    if (current?.favorite) {
      const res = await db
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('target_type', 'module')
        .eq('target_id', materialId)
      if (res.error) throw new Error(res.error.message)
    } else {
      const res = await db
        .from('favorites')
        .insert({ user_id: userId, target_type: 'module', target_id: materialId })
      if (res.error) throw new Error(res.error.message)
    }

    return refresh(userId, materialId)
  },

  async reset(userId: string, materialId: string): Promise<void> {
    const db = requireDb()

    // Delete the lesson rows first: the roll-up trigger recalculates the
    // module row from them, so removing the module row first would see it
    // rebuilt by the next lesson delete.
    const lessons = await db
      .from('lesson_progress')
      .delete()
      .eq('user_id', userId)
      .eq('module_id', materialId)
    if (lessons.error) throw new Error(lessons.error.message)

    const module = await db
      .from('module_progress')
      .delete()
      .eq('user_id', userId)
      .eq('module_id', materialId)
    if (module.error) throw new Error(module.error.message)

    cache.delete(key(userId, materialId))
  },

  async assignmentsFor(userId: string): Promise<Assignment[]> {
    const db = requireDb()
    const rows = unwrap(
      await db
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .order('due_at', { nullsFirst: false }),
    )
    return rows.map(rowToAssignment)
  },

  async pathProgress(userId: string, path: LearningPath): Promise<{ done: number; total: number }> {
    const db = requireDb()
    if (path.materialIds.length === 0) return { done: 0, total: 0 }

    const rows = unwrap(
      await db
        .from('module_progress')
        .select('module_id, state')
        .eq('user_id', userId)
        .eq('state', 'completed')
        .in('module_id', path.materialIds),
    )
    return { done: rows.length, total: path.materialIds.length }
  },

  async summary(userId: string): Promise<LearnerSummary> {
    const db = requireDb()

    // One RPC for the counts, one query for favourites. The alternative is
    // four table scans shipped to the browser.
    const [summaryRes, favRes] = await Promise.all([
      db.rpc('my_progress_summary'),
      db
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('target_type', 'module'),
    ])

    if (summaryRes.error) throw new Error(summaryRes.error.message)

    const s = (summaryRes.data ?? {}) as Record<string, number>
    const total = s.modules_total ?? 0
    const completed = s.modules_completed ?? 0

    // Minutes learned needs the duration of each completed module, which the
    // RPC does not carry. Fetched separately so the figure is real rather than
    // an assumed average per module.
    const durations = unwrap(
      await db
        .from('module_progress')
        .select('modules ( duration_minutes )')
        .eq('user_id', userId)
        .eq('state', 'completed'),
    ) as unknown as { modules: { duration_minutes: number } | null }[]

    return {
      assigned: s.assignments_open ?? 0,
      completed,
      inProgress: s.modules_in_progress ?? 0,
      overdue: s.assignments_overdue ?? 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      minutesLearned: durations.reduce((sum, d) => sum + (d.modules?.duration_minutes ?? 0), 0),
      averageScore: (s.attempts ?? 0) > 0 ? Number(s.avg_score ?? 0) : null,
      // Streaks were part of the retired reward layer; the field stays on the
      // type for the demo backend but is not computed against a real database.
      streakDays: 0,
      favorites: favRes.count ?? 0,
    }
  },

  async recent(userId: string, limit = 4): Promise<{ material: Material; progress: MaterialProgress }[]> {
    const db = requireDb()

    const rows = unwrap(
      await db
        .from('module_progress')
        .select('*, modules ( *, lessons ( id, title, summary, sort_order, status ) )')
        .eq('user_id', userId)
        .not('last_viewed_at', 'is', null)
        .order('last_viewed_at', { ascending: false })
        .limit(limit),
    ) as unknown as (Record<string, unknown> & { modules: Record<string, unknown> | null })[]

    const doneLessons = unwrap(
      await db.from('lesson_progress').select('lesson_id, module_id').eq('user_id', userId).eq('completed', true),
    )
    const byModule = new Map<string, string[]>()
    doneLessons.forEach((l) => {
      const list = byModule.get(l.module_id) ?? []
      list.push(l.lesson_id)
      byModule.set(l.module_id, list)
    })

    return rows
      .filter((r) => r.modules !== null)
      .map((r) => ({
        material: rowToMaterial(r.modules as never, []),
        progress: rowToProgress(r as never, byModule.get(String(r.module_id)) ?? [], false),
      }))
  },
}

/** Re-reads one progress row after a write, keeping the cache truthful. */
async function refresh(userId: string, materialId: string): Promise<MaterialProgress> {
  const db = requireDb()

  const [progressRes, lessonsRes, favRes] = await Promise.all([
    db.from('module_progress').select('*').eq('user_id', userId).eq('module_id', materialId).maybeSingle(),
    db.from('lesson_progress').select('lesson_id').eq('user_id', userId).eq('module_id', materialId).eq('completed', true),
    db.from('favorites').select('id').eq('user_id', userId).eq('target_type', 'module').eq('target_id', materialId).maybeSingle(),
  ])

  if (progressRes.error) throw new Error(progressRes.error.message)
  if (lessonsRes.error) throw new Error(lessonsRes.error.message)

  const completedIds = (lessonsRes.data ?? []).map((l) => l.lesson_id)
  const favorite = Boolean(favRes.data)

  const result: MaterialProgress = progressRes.data
    ? rowToProgress(progressRes.data, completedIds, favorite)
    : {
        userId,
        materialId,
        state: 'not-started',
        completedSectionIds: completedIds,
        favorite,
      }

  cache.set(key(userId, materialId), result)
  return result
}
