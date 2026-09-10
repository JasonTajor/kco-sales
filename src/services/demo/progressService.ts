import type { Assignment, LearningPath, Material, MaterialProgress } from '@/types'
import { delay } from '@/lib/delay'
import { pct } from '@/lib/format'
import { db, logActivity, persistProgress } from '../store'

export interface LearnerSummary {
  assigned: number
  completed: number
  inProgress: number
  overdue: number
  completionRate: number
  minutesLearned: number
  averageScore: number | null
  streakDays: number
  favorites: number
}

function ensure(userId: string, materialId: string): MaterialProgress {
  let row = db.progress.find((p) => p.userId === userId && p.materialId === materialId)
  if (!row) {
    row = {
      userId,
      materialId,
      state: 'not-started',
      completedSectionIds: [],
      favorite: false,
    }
    db.progress.push(row)
  }
  return row
}

export const progressService = {
  async forUser(userId: string): Promise<MaterialProgress[]> {
    return delay(db.progress.filter((p) => p.userId === userId), 140)
  },

  /** Synchronous read used inside render paths that already have the dataset. */
  peek(userId: string, materialId: string): MaterialProgress | undefined {
    return db.progress.find((p) => p.userId === userId && p.materialId === materialId)
  },

  async openMaterial(userId: string, materialId: string, sectionId?: string): Promise<MaterialProgress> {
    const row = ensure(userId, materialId)
    const now = new Date().toISOString()
    if (row.state === 'not-started') {
      row.state = 'in-progress'
      row.startedAt = now
    }
    row.lastViewedAt = now
    if (sectionId) row.lastViewedSectionId = sectionId
    persistProgress()
    return delay(row, 60)
  },

  async toggleSection(userId: string, material: Material, sectionId: string): Promise<MaterialProgress> {
    const row = ensure(userId, material.id)
    const has = row.completedSectionIds.includes(sectionId)
    row.completedSectionIds = has
      ? row.completedSectionIds.filter((s) => s !== sectionId)
      : [...row.completedSectionIds, sectionId]

    const now = new Date().toISOString()
    row.lastViewedAt = now
    if (row.completedSectionIds.length === 0) {
      row.state = 'in-progress'
      row.completedAt = undefined
    } else if (row.completedSectionIds.length >= material.sections.length) {
      row.state = 'completed'
      row.completedAt = now
      logActivity({ actorId: userId, action: 'material.completed', targetLabel: material.title, targetId: material.id })
    } else {
      row.state = 'in-progress'
      row.completedAt = undefined
    }
    persistProgress()
    return delay(row, 60)
  },

  async toggleFavorite(userId: string, materialId: string): Promise<MaterialProgress> {
    const row = ensure(userId, materialId)
    row.favorite = !row.favorite
    persistProgress()
    return delay(row, 60)
  },

  async reset(userId: string, materialId: string): Promise<void> {
    const row = ensure(userId, materialId)
    row.state = 'not-started'
    row.completedSectionIds = []
    row.completedAt = undefined
    row.lastViewedSectionId = undefined
    persistProgress()
    return delay(undefined, 140)
  },

  async assignmentsFor(userId: string): Promise<Assignment[]> {
    return delay(
      db.assignments
        .filter((a) => a.userId === userId)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      140,
    )
  },

  async pathProgress(userId: string, path: LearningPath): Promise<{ done: number; total: number }> {
    const rows = db.progress.filter((p) => p.userId === userId && path.materialIds.includes(p.materialId))
    return delay(
      { done: rows.filter((r) => r.state === 'completed').length, total: path.materialIds.length },
      100,
    )
  },

  async summary(userId: string): Promise<LearnerSummary> {
    const rows = db.progress.filter((p) => p.userId === userId)
    const assignments = db.assignments.filter((a) => a.userId === userId)
    const attempts = db.attempts.filter((a) => a.userId === userId)

    const completed = rows.filter((r) => r.state === 'completed')
    const minutes = completed.reduce((sum, r) => {
      const m = db.materials.find((x) => x.id === r.materialId)
      return sum + (m?.duration ?? 0)
    }, 0)

    // Partial credit for materials in progress, so the bar is not all-or-nothing.
    const partial = rows
      .filter((r) => r.state === 'in-progress')
      .reduce((sum, r) => {
        const m = db.materials.find((x) => x.id === r.materialId)
        if (!m) return sum
        return sum + Math.round((m.duration * r.completedSectionIds.length) / m.sections.length)
      }, 0)

    const published = db.materials.filter((m) => m.status === 'published' && m.audience.includes('sales'))

    return delay({
      assigned: assignments.length,
      completed: completed.length,
      inProgress: rows.filter((r) => r.state === 'in-progress').length,
      overdue: assignments.filter((a) => a.status === 'overdue').length,
      completionRate: pct(completed.length, published.length),
      minutesLearned: minutes + partial,
      averageScore: attempts.length
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : null,
      streakDays: 6,
      favorites: rows.filter((r) => r.favorite).length,
    })
  },

  /** Recently opened materials, most recent first. */
  async recent(userId: string, limit = 4): Promise<{ material: Material; progress: MaterialProgress }[]> {
    const rows = db.progress
      .filter((p) => p.userId === userId && p.lastViewedAt)
      .sort((a, b) => (b.lastViewedAt ?? '').localeCompare(a.lastViewedAt ?? ''))
      .slice(0, limit)

    return delay(
      rows
        .map((progress) => ({ material: db.materials.find((m) => m.id === progress.materialId)!, progress }))
        .filter((r) => r.material && r.material.status === 'published'),
      120,
    )
  },
}
