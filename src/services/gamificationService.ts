import type { LearnerJourney, Material, MaterialProgress, PathUnit } from '@/types'
import {
  achievementsFrom,
  buildUnits,
  goalFrom,
  levelFromXp,
  pendingXp as derivePendingXp,
  recentXpFrom,
  streakFrom,
  totalXp,
  XP_ASSESSMENT_PASS,
  XP_MATERIAL_BONUS,
  XP_PER_SCENARIO,
  XP_PER_SECTION,
  type RewardInput,
} from '@/features/rewards/derive'
import { dailyGoalTarget } from '@/features/onboarding/storage'
import { learningPaths } from '@/data/paths'
import { assessmentService } from './assessmentService'
import { materialService } from './materialService'
import { progressService } from './progressService'

/**
 * The reward layer.
 *
 * One implementation for both backends, because it computes nothing itself: it
 * asks the ordinary services for the learner's progress and attempts, then
 * hands them to the pure functions in `features/rewards/derive`. Whichever
 * backend supplied the records, the arithmetic is identical.
 *
 * The previous version read the demo store directly. That was wrong in a way
 * worth recording: with Supabase connected it computed a learner's level from
 * seeded sample data rather than their actual progress, and it dragged the
 * whole seeded content library into the bundle to do it.
 */
export const gamificationService = {
  /** Exposed so the viewer can show what a section is worth before you do it. */
  constants: {
    XP_PER_SECTION,
    XP_MATERIAL_BONUS,
    XP_ASSESSMENT_PASS,
    XP_PER_SCENARIO,
  },

  /**
   * XP still available on a material.
   *
   * Synchronous, because it is called during render next to the material's
   * title. It reads `progressService.peek`, the cache the progress service
   * populates on load - so it is accurate once the page's data has arrived and
   * reports the full value before then, which is the right way round: the hint
   * is "this is worth 75 XP", and briefly over-reporting is better than
   * briefly showing zero.
   */
  pendingXp(userId: string, material: Material): number {
    return derivePendingXp(material, progressService.peek(userId, material.id))
  },

  async journey(userId: string): Promise<LearnerJourney> {
    const input = await gather(userId)

    const level = levelFromXp(totalXp(input))
    const units = buildUnits(input)
    const nextUp = units
      .flatMap((u) => u.nodes)
      .find((n) => n.state === 'current' || n.state === 'available')

    return {
      level,
      streak: streakFrom(input),
      // The learner's own daily commitment, set during first-run setup.
      goal: goalFrom(input, dailyGoalTarget(userId)),
      achievements: achievementsFrom(input),
      recentXp: recentXpFrom(input),
      nextUp,
    }
  },

  async units(userId: string): Promise<PathUnit[]> {
    return buildUnits(await gather(userId))
  },
}

/**
 * Collects everything the derivation needs in one place.
 *
 * Four requests in parallel rather than in sequence: none of them depends on
 * another, and the journey is rendered above the fold on the learner's
 * dashboard.
 */
async function gather(userId: string): Promise<RewardInput> {
  const [progress, attempts, materials, assessments] = await Promise.all([
    progressService.forUser(userId),
    assessmentService.attemptsFor(userId),
    materialService.list({ status: 'published' }),
    assessmentService.list(),
  ])

  return {
    progress: progress as MaterialProgress[],
    attempts,
    materials,
    // Paths are authored content that both backends serve identically today;
    // when a path service exists this becomes another parallel fetch.
    paths: learningPaths,
    assessmentTitles: new Map(assessments.map((a) => [a.id, a.title])),
  }
}

export { levelFromXp, totalXp, xpForMaterial, buildUnits } from '@/features/rewards/derive'
