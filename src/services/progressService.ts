import { pick } from './backend'
import { progressService as supabaseImpl } from './supabase/progressService'
import { progressService as demoImpl } from './demo/progressService'

/**
 * Learner progress, favourites and assignments.
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise. Both satisfy the same type, so nothing
 * downstream of this file knows or cares which is in play.
 */
export const progressService = pick(supabaseImpl, demoImpl)

export type { LearnerSummary } from './demo/progressService'
