import type { Assignment, AssignmentStatus } from '@/types'
import { delay } from '@/lib/delay'
import { uid } from '@/lib/id'
import { db, logActivity, persistAssignments } from '../store'

export interface AssignmentRow extends Assignment {
  userName: string
  userTeam: string
  targetLabel: string
  assignerName: string
}

function decorate(a: Assignment): AssignmentRow {
  const user = db.users.find((u) => u.id === a.userId)
  const assigner = db.users.find((u) => u.id === a.assignedBy)
  const target =
    a.targetType === 'material'
      ? db.materials.find((m) => m.id === a.targetId)?.title
      : a.targetType === 'path'
        ? db.paths.find((p) => p.id === a.targetId)?.title
        : db.assessments.find((x) => x.id === a.targetId)?.title

  return {
    ...a,
    userName: user?.name ?? 'Unknown user',
    userTeam: user?.team ?? ' - ',
    targetLabel: target ?? 'Removed content',
    assignerName: assigner?.name ?? 'System',
  }
}

export const assignmentService = {
  async list(filters: { status?: AssignmentStatus | 'all'; search?: string; targetType?: string } = {}): Promise<AssignmentRow[]> {
    const q = (filters.search ?? '').trim().toLowerCase()
    const rows = db.assignments.map(decorate).filter((a) => {
      if (filters.status && filters.status !== 'all' && a.status !== filters.status) return false
      if (filters.targetType && filters.targetType !== 'all' && a.targetType !== filters.targetType) return false
      if (!q) return true
      return a.userName.toLowerCase().includes(q) || a.targetLabel.toLowerCase().includes(q)
    })
    return delay(rows.sort((a, b) => a.dueAt.localeCompare(b.dueAt)))
  },

  async createMany(
    input: { userIds: string[]; targetType: Assignment['targetType']; targetId: string; dueAt: string; note?: string },
    actorId: string,
  ): Promise<Assignment[]> {
    const created = input.userIds.map<Assignment>((userId) => ({
      id: uid('asg'),
      userId,
      targetType: input.targetType,
      targetId: input.targetId,
      assignedBy: actorId,
      assignedAt: new Date().toISOString(),
      dueAt: input.dueAt,
      status: 'not-started',
      note: input.note,
    }))
    db.assignments.push(...created)
    persistAssignments()
    const label =
      db.materials.find((m) => m.id === input.targetId)?.title ??
      db.paths.find((p) => p.id === input.targetId)?.title ??
      db.assessments.find((a) => a.id === input.targetId)?.title ??
      'content'
    logActivity({
      actorId,
      action: 'assignment.created',
      targetLabel: `${created.length} learner${created.length === 1 ? '' : 's'} → ${label}`,
    })
    return delay(created, 320)
  },

  async remove(ids: string[]): Promise<void> {
    db.assignments = db.assignments.filter((a) => !ids.includes(a.id))
    persistAssignments()
    return delay(undefined, 200)
  },
}
