import type { AssessmentAttempt, Assignment, MaterialProgress } from '@/types'
import { materials } from '@/data/materials'
import { assessments } from '@/data/assessments'
import { users } from './users'
import { between, daysAgo, daysAhead, mulberry32, pick } from './rng'

const publishedMaterials = materials.filter((m) => m.status === 'published')
const salesUsers = users.filter((u) => u.role === 'sales')

/**
 * Progress is generated once from a fixed seed, then mutated in memory by the
 * services as the user works. Reload restores the baseline.
 */
function generateProgress(): MaterialProgress[] {
  const rand = mulberry32(20260909)
  const rows: MaterialProgress[] = []

  for (const user of users) {
    // Tenure drives how much of the library a person has worked through.
    const tenure = (Date.now() - new Date(user.joinedAt).getTime()) / 86_400_000
    const appetite = user.status === 'active' ? Math.min(1, tenure / 180 + 0.15) : 0.25

    for (const material of publishedMaterials) {
      const roll = rand()
      const total = material.sections.length
      let state: MaterialProgress['state'] = 'not-started'
      let done = 0

      if (roll < appetite * 0.62) {
        state = 'completed'
        done = total
      } else if (roll < appetite * 0.95) {
        state = 'in-progress'
        done = between(rand, 1, Math.max(1, total - 1))
      }

      if (state === 'not-started' && rand() > 0.25) continue

      const completedSectionIds = material.sections.slice(0, done).map((s) => s.id)
      const lastSeen = between(rand, 0, 30)

      rows.push({
        userId: user.id,
        materialId: material.id,
        state,
        completedSectionIds,
        lastViewedSectionId:
          state === 'not-started' ? undefined : material.sections[Math.max(0, done - 1)]!.id,
        startedAt: state === 'not-started' ? undefined : daysAgo(lastSeen + between(rand, 1, 20)),
        completedAt: state === 'completed' ? daysAgo(lastSeen) : undefined,
        lastViewedAt: state === 'not-started' ? undefined : daysAgo(lastSeen, between(rand, 0, 20)),
        favorite: rand() > 0.82,
      })
    }
  }
  return rows
}

export const seedProgress: MaterialProgress[] = generateProgress()

function generateAttempts(): AssessmentAttempt[] {
  const rand = mulberry32(778812)
  const rows: AssessmentAttempt[] = []
  let n = 0

  for (const user of salesUsers) {
    for (const assessment of assessments) {
      if (rand() > 0.58) continue
      const attempts = between(rand, 1, 2)
      for (let i = 0; i < attempts; i++) {
        // Later attempts score better - people learn.
        const base = between(rand, 55, 100)
        const score = Math.min(100, base + i * between(rand, 4, 14))
        const at = between(rand, 1, 60)
        n += 1
        rows.push({
          id: `att-${n}`,
          userId: user.id,
          assessmentId: assessment.id,
          score,
          attemptNumber: 1,
          passed: score >= assessment.passingScore,
          startedAt: daysAgo(at, 1),
          submittedAt: daysAgo(at),
        })
      }
    }
  }
  return rows
}

export const seedAttempts: AssessmentAttempt[] = generateAttempts()

function generateAssignments(): Assignment[] {
  const rand = mulberry32(31415)
  const rows: Assignment[] = []
  const admins = users.filter((u) => u.role === 'admin').map((u) => u.id)
  let n = 0

  for (const user of salesUsers) {
    const count = between(rand, 1, 3)
    const chosen = new Set<string>()
    for (let i = 0; i < count; i++) {
      const material = pick(rand, publishedMaterials)
      if (chosen.has(material.id)) continue
      chosen.add(material.id)

      const progress = seedProgress.find(
        (p) => p.userId === user.id && p.materialId === material.id,
      )
      const dueIn = between(rand, -9, 21)
      let status: Assignment['status'] = 'not-started'
      if (progress?.state === 'completed') status = 'completed'
      else if (progress?.state === 'in-progress') status = 'in-progress'
      if (status !== 'completed' && dueIn < 0) status = 'overdue'

      n += 1
      rows.push({
        id: `asg-${n}`,
        userId: user.id,
        targetType: 'material',
        targetId: material.id,
        assignedBy: pick(rand, admins),
        assignedAt: daysAgo(between(rand, 3, 40)),
        dueAt: dueIn >= 0 ? daysAhead(dueIn) : daysAgo(-dueIn),
        status,
        note: rand() > 0.7 ? 'Please complete before your next coaching session.' : undefined,
      })
    }
  }

  // A path assignment for the newest hires, so the Assignments table shows both types.
  const newHires = salesUsers.filter((u) => u.status === 'pending')
  for (const hire of newHires) {
    n += 1
    rows.push({
      id: `asg-${n}`,
      targetType: 'path',
      targetId: 'path-new-hire',
      userId: hire.id,
      assignedBy: 'usr-admin-jason',
      assignedAt: daysAgo(1),
      dueAt: daysAhead(6),
      status: 'not-started',
      note: 'Week one onboarding - complete before taking live conversations.',
    })
  }

  return rows
}

export const seedAssignments: Assignment[] = generateAssignments()
