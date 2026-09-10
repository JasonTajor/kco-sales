import type { ActivityLogEntry, Team } from '@/types'
import { delay } from '@/lib/delay'
import { pct } from '@/lib/format'
import { TEAMS } from '@/types'
import { db } from '../store'

export interface AdminOverview {
  totalSalesUsers: number
  activeThisWeek: number
  publishedMaterials: number
  draftMaterials: number
  trainingCompletion: number
  averageQuizScore: number
  overdueAssignments: number
  claimReviewCount: number
  pendingUsers: number
  assessmentsTaken: number
}

export interface SeriesPoint {
  label: string
  value: number
}

export interface TeamCompletion {
  team: Team
  completed: number
  inProgress: number
  notStarted: number
  rate: number
  headcount: number
}

export interface MaterialUsage {
  materialId: string
  title: string
  views: number
  completions: number
  completionRate: number
}

export interface AtRiskLearner {
  userId: string
  name: string
  team: Team
  overdue: number
  completionRate: number
  lastActiveAt: string
  averageScore: number | null
}

const DAY = 86_400_000

export const reportService = {
  async overview(): Promise<AdminOverview> {
    const salesUsers = db.users.filter((u) => u.role === 'sales')
    const published = db.materials.filter((m) => m.status === 'published')
    const learnerRows = db.progress.filter((p) => salesUsers.some((u) => u.id === p.userId))
    const completed = learnerRows.filter((p) => p.state === 'completed').length
    const possible = salesUsers.length * published.filter((m) => m.audience.includes('sales')).length

    const scores = db.attempts.map((a) => a.score)
    const weekAgo = Date.now() - 7 * DAY

    return delay({
      totalSalesUsers: salesUsers.length,
      activeThisWeek: salesUsers.filter((u) => new Date(u.lastActiveAt).getTime() > weekAgo).length,
      publishedMaterials: published.length,
      draftMaterials: db.materials.filter((m) => m.status === 'draft').length,
      trainingCompletion: pct(completed, possible),
      averageQuizScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      overdueAssignments: db.assignments.filter((a) => a.status === 'overdue').length,
      claimReviewCount: db.materials.filter((m) => m.needsClaimReview).length,
      pendingUsers: db.users.filter((u) => u.status === 'pending').length,
      assessmentsTaken: db.attempts.length,
    })
  },

  /** Daily counts of learning events over the trailing window. */
  async learningActivity(days = 14): Promise<SeriesPoint[]> {
    const now = Date.now()
    const buckets: SeriesPoint[] = []

    for (let i = days - 1; i >= 0; i--) {
      const start = now - (i + 1) * DAY
      const end = now - i * DAY
      const count = db.activityLog.filter((e) => {
        const t = new Date(e.at).getTime()
        return t > start && t <= end && (e.action === 'material.viewed' || e.action === 'material.completed' || e.action === 'assessment.submitted')
      }).length
      buckets.push({
        label: new Date(end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        value: count,
      })
    }
    return delay(buckets, 200)
  },

  async completionByTeam(): Promise<TeamCompletion[]> {
    const published = db.materials.filter((m) => m.status === 'published' && m.audience.includes('sales'))
    const rows = TEAMS.map<TeamCompletion>((team) => {
      const members = db.users.filter((u) => u.role === 'sales' && u.team === team)
      const rows = db.progress.filter((p) => members.some((m) => m.id === p.userId))
      const completed = rows.filter((r) => r.state === 'completed').length
      const inProgress = rows.filter((r) => r.state === 'in-progress').length
      const possible = members.length * published.length
      return {
        team,
        completed,
        inProgress,
        notStarted: Math.max(0, possible - completed - inProgress),
        rate: pct(completed, possible),
        headcount: members.length,
      }
    }).filter((r) => r.headcount > 0)

    return delay(rows.sort((a, b) => b.rate - a.rate), 200)
  },

  async popularMaterials(limit = 6): Promise<MaterialUsage[]> {
    const rows = db.materials
      .filter((m) => m.status === 'published')
      .map<MaterialUsage>((m) => {
        const progressRows = db.progress.filter((p) => p.materialId === m.id && p.state !== 'not-started')
        const completions = progressRows.filter((p) => p.state === 'completed').length
        const logViews = db.activityLog.filter((e) => e.action === 'material.viewed' && e.targetLabel === m.title).length
        const views = progressRows.length + logViews
        return {
          materialId: m.id,
          title: m.title,
          views,
          completions,
          completionRate: pct(completions, Math.max(1, progressRows.length)),
        }
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)

    return delay(rows, 200)
  },

  async scoreDistribution(): Promise<SeriesPoint[]> {
    const bands = [
      { label: '0-59', min: 0, max: 59 },
      { label: '60-69', min: 60, max: 69 },
      { label: '70-79', min: 70, max: 79 },
      { label: '80-89', min: 80, max: 89 },
      { label: '90-100', min: 90, max: 100 },
    ]
    return delay(
      bands.map((b) => ({
        label: b.label,
        value: db.attempts.filter((a) => a.score >= b.min && a.score <= b.max).length,
      })),
      180,
    )
  },

  async atRisk(limit = 6): Promise<AtRiskLearner[]> {
    const published = db.materials.filter((m) => m.status === 'published' && m.audience.includes('sales')).length

    const rows = db.users
      .filter((u) => u.role === 'sales' && u.status !== 'pending')
      .map<AtRiskLearner>((u) => {
        const rows = db.progress.filter((p) => p.userId === u.id)
        const attempts = db.attempts.filter((a) => a.userId === u.id)
        return {
          userId: u.id,
          name: u.name,
          team: u.team,
          overdue: db.assignments.filter((a) => a.userId === u.id && a.status === 'overdue').length,
          completionRate: pct(rows.filter((r) => r.state === 'completed').length, published),
          lastActiveAt: u.lastActiveAt,
          averageScore: attempts.length
            ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
            : null,
        }
      })
      // Overdue work first, then lowest completion.
      .sort((a, b) => b.overdue - a.overdue || a.completionRate - b.completionRate)
      .filter((r) => r.overdue > 0 || r.completionRate < 40)
      .slice(0, limit)

    return delay(rows, 220)
  },

  async activityLog(filters: { search?: string; action?: string; actorId?: string; limit?: number } = {}): Promise<ActivityLogEntry[]> {
    const q = (filters.search ?? '').trim().toLowerCase()
    const rows = db.activityLog.filter((e) => {
      if (filters.action && filters.action !== 'all' && e.action !== filters.action) return false
      if (filters.actorId && filters.actorId !== 'all' && e.actorId !== filters.actorId) return false
      if (!q) return true
      const actor = db.users.find((u) => u.id === e.actorId)?.name ?? ''
      return e.targetLabel.toLowerCase().includes(q) || actor.toLowerCase().includes(q) || e.action.includes(q)
    })
    return delay(rows.slice(0, filters.limit ?? 200), 200)
  },
}
