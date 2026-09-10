import type { ActivityAction, ActivityLogEntry } from '@/types'
import { materials } from '@/data/materials'
import { assessments } from '@/data/assessments'
import { users } from './users'
import { between, mulberry32, pick } from './rng'
import { NOW } from './rng'

const actions: { action: ActivityAction; weight: number }[] = [
  { action: 'material.viewed', weight: 34 },
  { action: 'material.completed', weight: 14 },
  { action: 'assessment.submitted', weight: 12 },
  { action: 'user.login', weight: 16 },
  { action: 'assignment.created', weight: 7 },
  { action: 'material.updated', weight: 6 },
  { action: 'material.published', weight: 3 },
  { action: 'activity.ran', weight: 4 },
  { action: 'user.invited', weight: 2 },
  { action: 'material.archived', weight: 1 },
  { action: 'settings.updated', weight: 1 },
]

const weighted: ActivityAction[] = actions.flatMap((a) => Array<ActivityAction>(a.weight).fill(a.action))
const adminOnly: ActivityAction[] = [
  'material.published',
  'material.archived',
  'material.updated',
  'material.created',
  'assignment.created',
  'user.invited',
  'user.deactivated',
  'settings.updated',
]

function label(action: ActivityAction, rand: () => number): string {
  if (action.startsWith('material')) return pick(rand, materials).title
  if (action === 'assessment.submitted') return pick(rand, assessments).title
  if (action === 'assignment.created') return `${pick(rand, users).name} → ${pick(rand, materials).title}`
  if (action.startsWith('user')) return pick(rand, users).name
  if (action === 'activity.ran') return 'Customer Acting'
  return 'Notification defaults'
}

function generate(): ActivityLogEntry[] {
  const rand = mulberry32(90210)
  const rows: ActivityLogEntry[] = []
  const admins = users.filter((u) => u.role === 'admin')
  const actives = users.filter((u) => u.status === 'active')

  for (let i = 0; i < 240; i++) {
    const action = pick(rand, weighted)
    const actor = adminOnly.includes(action) ? pick(rand, admins) : pick(rand, actives)
    // Cluster recent activity toward the present.
    const minutesAgo = Math.floor(Math.pow(rand(), 2.2) * 60 * 24 * 30)
    rows.push({
      id: `log-${i + 1}`,
      actorId: actor.id,
      action,
      targetLabel: label(action, rand),
      at: new Date(NOW - minutesAgo * 60_000).toISOString(),
      ip: `112.203.${between(rand, 1, 254)}.${between(rand, 1, 254)}`,
    })
  }

  return rows.sort((a, b) => b.at.localeCompare(a.at))
}

export const seedActivityLog: ActivityLogEntry[] = generate()
