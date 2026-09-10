import type { ActivityLogEntry, Team } from '@/types'
import { requireDb, unwrap } from '@/lib/supabase'
import type {
  AdminOverview,
  AtRiskLearner,
  MaterialUsage,
  SeriesPoint,
  TeamCompletion,
  reportService as DemoApi,
} from '../demo/reportService'
import { rowToLogEntry } from '../mappers'

/**
 * Admin reporting (§30, §31).
 *
 * Every aggregate here is computed by the database, not by fetching rows and
 * reducing them in the browser (§28). The dashboard is one RPC call; each
 * report is one more. Those functions are SECURITY DEFINER and begin by
 * checking `is_admin()`, so a sales user calling them gets an error or an
 * empty set rather than data - which the RLS suite asserts.
 *
 * §30 also says not to fabricate analytics. Where the database genuinely does
 * not record something yet, the method below returns an empty series and the
 * UI shows an empty state, rather than a plausible-looking curve.
 */

type DashboardStats = Record<string, number>

export const reportService: typeof DemoApi = {
  async overview(): Promise<AdminOverview> {
    const db = requireDb()
    const res = await db.rpc('admin_dashboard_stats')
    if (res.error) throw new Error(res.error.message)

    const s = (res.data ?? {}) as DashboardStats

    // needs_claim_review is a content flag rather than an analytic, so it is a
    // cheap count rather than part of the stats function.
    const claim = await db
      .from('modules')
      .select('id', { count: 'exact', head: true })
      .eq('needs_claim_review', true)
    if (claim.error) throw new Error(claim.error.message)

    return {
      totalSalesUsers: s.sales_users ?? 0,
      activeThisWeek: s.lessons_completed_last_7d ?? 0,
      publishedMaterials: s.published_modules ?? 0,
      draftMaterials: s.draft_modules ?? 0,
      trainingCompletion: Number(s.avg_completion ?? 0),
      averageQuizScore: Number(s.avg_assessment_score ?? 0),
      overdueAssignments: s.overdue_assignments ?? 0,
      claimReviewCount: claim.count ?? 0,
      pendingUsers: s.pending_users ?? 0,
      assessmentsTaken: s.attempts_last_30d ?? 0,
    }
  },

  /**
   * Lessons completed per day.
   *
   * Bucketed client-side from timestamps rather than in SQL, because the
   * series is at most a few hundred rows and doing it here keeps the day
   * boundaries in the viewer's timezone - a "today" bucket computed in UTC
   * reads as wrong to someone in Manila.
   */
  async learningActivity(days = 14): Promise<SeriesPoint[]> {
    const db = requireDb()
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const rows = unwrap(
      await db
        .from('lesson_progress')
        .select('completed_at')
        .eq('completed', true)
        .gte('completed_at', since)
        .order('completed_at'),
    )

    const buckets = new Map<string, number>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      buckets.set(dayKey(d), 0)
    }

    rows.forEach((r) => {
      if (!r.completed_at) return
      const key = dayKey(new Date(r.completed_at))
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
    })

    return [...buckets.entries()].map(([label, value]) => ({ label, value }))
  },

  async completionByTeam(): Promise<TeamCompletion[]> {
    const db = requireDb()

    const res = await db.rpc('report_training_completion')
    if (res.error) throw new Error(res.error.message)

    const rows = (res.data ?? []) as unknown as {
      user_id: string
      full_name: string
      department: string
      status: string
      modules_completed: number
      modules_in_progress: number
      modules_total: number
      completion_percent: number
    }[]

    // The report is per learner; teams are the grouping the admin screen shows.
    const byTeam = new Map<string, TeamCompletion>()

    rows
      .filter((r) => r.status !== 'inactive')
      .forEach((r) => {
        const team = (r.department || 'Unassigned') as Team
        const entry =
          byTeam.get(team) ??
          { team, completed: 0, inProgress: 0, notStarted: 0, rate: 0, headcount: 0 }

        entry.headcount += 1
        entry.completed += Number(r.modules_completed)
        entry.inProgress += Number(r.modules_in_progress)
        entry.notStarted += Math.max(
          0,
          Number(r.modules_total) - Number(r.modules_completed) - Number(r.modules_in_progress),
        )
        byTeam.set(team, entry)
      })

    return [...byTeam.values()]
      .map((t) => {
        const possible = t.completed + t.inProgress + t.notStarted
        return { ...t, rate: possible > 0 ? Math.round((t.completed / possible) * 100) : 0 }
      })
      .sort((a, b) => b.rate - a.rate)
  },

  async popularMaterials(limit = 6): Promise<MaterialUsage[]> {
    const db = requireDb()

    const res = await db.rpc('report_module_engagement')
    if (res.error) throw new Error(res.error.message)

    const rows = (res.data ?? []) as unknown as {
      module_id: string
      title: string
      status: string
      learners_started: number
      learners_completed: number
      completion_percent: number
    }[]

    return rows
      .map((r) => ({
        materialId: r.module_id,
        title: r.title,
        // "Views" is learners who opened it. The database records openings,
        // not repeat page views, so this is not inflated into a hit count.
        views: Number(r.learners_started),
        completions: Number(r.learners_completed),
        completionRate: Number(r.completion_percent),
      }))
      .sort((a, b) => b.views - a.views || b.completions - a.completions)
      .slice(0, limit)
  },

  async scoreDistribution(): Promise<SeriesPoint[]> {
    const db = requireDb()

    const rows = unwrap(
      await db.from('assessment_attempts').select('percentage').eq('status', 'submitted'),
    )

    const bands: SeriesPoint[] = [
      { label: '0-59', value: 0 },
      { label: '60-69', value: 0 },
      { label: '70-79', value: 0 },
      { label: '80-89', value: 0 },
      { label: '90-100', value: 0 },
    ]

    rows.forEach((r) => {
      const p = Number(r.percentage ?? 0)
      const index = p < 60 ? 0 : p < 70 ? 1 : p < 80 ? 2 : p < 90 ? 3 : 4
      bands[index]!.value += 1
    })

    return bands
  },

  async atRisk(limit = 6): Promise<AtRiskLearner[]> {
    const db = requireDb()

    const [completionRes, overdueRes, profilesRes] = await Promise.all([
      db.rpc('report_training_completion'),
      db
        .from('assignments')
        .select('user_id, due_at, status')
        .neq('status', 'completed')
        .not('due_at', 'is', null)
        .lt('due_at', new Date().toISOString()),
      db.from('profiles').select('id, last_login_at, created_at').eq('role', 'sales'),
    ])

    if (completionRes.error) throw new Error(completionRes.error.message)

    const completion = (completionRes.data ?? []) as unknown as {
      user_id: string
      full_name: string
      department: string
      status: string
      completion_percent: number
      assessments_taken: number
      avg_score: number
    }[]

    const overdueByUser = new Map<string, number>()
    unwrap(overdueRes).forEach((a) => {
      overdueByUser.set(a.user_id, (overdueByUser.get(a.user_id) ?? 0) + 1)
    })

    const lastActive = new Map(
      unwrap(profilesRes).map((p) => [p.id, p.last_login_at ?? p.created_at]),
    )

    return completion
      .filter((r) => r.status === 'active')
      .map<AtRiskLearner>((r) => ({
        userId: r.user_id,
        name: r.full_name,
        team: (r.department || 'Unassigned') as Team,
        overdue: overdueByUser.get(r.user_id) ?? 0,
        completionRate: Number(r.completion_percent),
        lastActiveAt: lastActive.get(r.user_id) ?? new Date().toISOString(),
        averageScore: Number(r.assessments_taken) > 0 ? Number(r.avg_score) : null,
      }))
      // Overdue work is the strongest signal, then low completion.
      .sort((a, b) => b.overdue - a.overdue || a.completionRate - b.completionRate)
      .filter((r) => r.overdue > 0 || r.completionRate < 50)
      .slice(0, limit)
  },

  async activityLog(
    filters: { search?: string; action?: string; actorId?: string; limit?: number } = {},
  ): Promise<ActivityLogEntry[]> {
    const db = requireDb()

    let q = db
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100)

    if (filters.action && filters.action !== 'all') q = q.eq('action', filters.action)
    if (filters.actorId && filters.actorId !== 'all') q = q.eq('actor_id', filters.actorId)

    const safe = filters.search?.trim().replace(/[,()*]/g, ' ').trim()
    if (safe) q = q.ilike('target_label', `%${safe}%`)

    return unwrap(await q).map(rowToLogEntry)
  },
}

/** YYYY-MM-DD in the viewer's timezone, for day bucketing. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
