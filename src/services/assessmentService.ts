import { pick } from './backend'
import { assessmentService as supabaseImpl } from './supabase/assessmentService'
import { assessmentService as demoImpl } from './demo/assessmentService'

/**
 * Assessments, attempts and scoring.
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise. Both satisfy the same type, so nothing
 * downstream of this file knows or cares which is in play.
 */
export const assessmentService = pick(supabaseImpl, demoImpl)
