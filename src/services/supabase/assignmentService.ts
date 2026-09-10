import type { Assignment, AssignmentStatus } from '@/types'
import { requireDb, unwrap } from '@/lib/supabase'
import type { AssignmentRow, assignmentService as DemoApi } from '../demo/assignmentService'
import { domainTargetToDb, rowToAssignment } from '../mappers'

/**
 * Assignments (§27).
 *
 * Creating them goes through `admin_assign`, which upserts every recipient,
 * fans out the notifications, and writes the audit entry in one transaction.
 * Doing that as N inserts from the browser would leave a partial assignment
 * behind whenever a request failed halfway through a class of twenty.
 */

/** Resolves target titles, which live in four different tables. */
async function targetLabels(rows: Assignment[]): Promise<Map<string, string>> {
  const db = requireDb()
  const labels = new Map<string, string>()

  const ids = (type: Assignment['targetType']) =>
    rows.filter((r) => r.targetType === type).map((r) => r.targetId)

  const moduleIds = ids('material')
  const pathIds = ids('path')
  const assessmentIds = ids('assessment')

  // Three queries at most, regardless of how many assignments are listed.
  const [modules, paths, assessments] = await Promise.all([
    moduleIds.length ? db.from('modules').select('id, title').in('id', moduleIds) : null,
    pathIds.length ? db.from('learning_paths').select('id, title').in('id', pathIds) : null,
    assessmentIds.length
      ? db.from('assessments').select('id, title').in('id', assessmentIds)
      : null,
  ])

  ;[modules, paths, assessments].forEach((res) => {
    if (!res) return
    unwrap(res).forEach((r) => labels.set(r.id, r.title))
  })

  return labels
}

export const assignmentService: typeof DemoApi = {
  async list(
    filters: { status?: AssignmentStatus | 'all'; search?: string; targetType?: string } = {},
  ): Promise<AssignmentRow[]> {
    const db = requireDb()

    // profiles is embedded through assignments.user_id, so the learner's name
    // and team arrive with the row rather than needing a second pass.
    const raw = unwrap(
      await db
        .from('assignments')
        .select('*, assignee:profiles!assignments_user_id_fkey ( full_name, department )')
        .order('due_at', { nullsFirst: false }),
    ) as unknown as (Record<string, unknown> & {
      assignee: { full_name: string; department: string | null } | null
    })[]

    const assignments = raw.map((r) => rowToAssignment(r as never))
    const labels = await targetLabels(assignments)

    // assigned_by is also a profile, but a different foreign key to the same
    // table, so it is fetched separately rather than embedded twice.
    const assignerIds = [...new Set(assignments.map((a) => a.assignedBy).filter(Boolean))]
    const assigners = assignerIds.length
      ? unwrap(await db.from('profiles').select('id, full_name').in('id', assignerIds))
      : []
    const assignerName = new Map(assigners.map((a) => [a.id, a.full_name]))

    const decorated: AssignmentRow[] = assignments.map((a, i) => ({
      ...a,
      userName: raw[i]?.assignee?.full_name ?? 'Unknown user',
      userTeam: raw[i]?.assignee?.department ?? ' - ',
      targetLabel: labels.get(a.targetId) ?? 'Removed content',
      assignerName: assignerName.get(a.assignedBy) ?? 'System',
    }))

    // Status is filtered here rather than in SQL because 'overdue' is derived
    // from due_at at read time, not stored - see assignment_effective_status().
    const q = filters.search?.trim().toLowerCase() ?? ''
    return decorated.filter((a) => {
      if (filters.status && filters.status !== 'all' && a.status !== filters.status) return false
      if (filters.targetType && filters.targetType !== 'all' && a.targetType !== filters.targetType) {
        return false
      }
      if (!q) return true
      return a.userName.toLowerCase().includes(q) || a.targetLabel.toLowerCase().includes(q)
    })
  },

  async createMany(
    input: {
      userIds: string[]
      targetType: Assignment['targetType']
      targetId: string
      dueAt: string
      note?: string
    },
    _actorId: string,
  ): Promise<Assignment[]> {
    const db = requireDb()

    const res = await db.rpc('admin_assign', {
      p_user_ids: input.userIds,
      p_target_type: domainTargetToDb(input.targetType),
      p_target_id: input.targetId,
      p_due_at: input.dueAt || null,
      p_note: input.note ?? '',
    })
    if (res.error) throw new Error(res.error.message)

    const rows = unwrap(
      await db
        .from('assignments')
        .select('*')
        .in('user_id', input.userIds)
        .eq('target_type', domainTargetToDb(input.targetType))
        .eq('target_id', input.targetId),
    )
    return rows.map(rowToAssignment)
  },

  async remove(ids: string[]): Promise<void> {
    const db = requireDb()
    const res = await db.from('assignments').delete().in('id', ids)
    if (res.error) throw new Error(res.error.message)
  },
}
