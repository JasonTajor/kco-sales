import { pick } from './backend'
import { trainingService as supabaseImpl } from './supabase/trainingService'
import { trainingService as demoImpl } from './demo/trainingService'

/**
 * Training activities and practice scenarios.
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise. Both satisfy the same type, so nothing
 * downstream of this file knows or cares which is in play.
 */
export const trainingService = pick(supabaseImpl, demoImpl)
