import { pick } from './backend'
import { assignmentService as supabaseImpl } from './supabase/assignmentService'
import { assignmentService as demoImpl } from './demo/assignmentService'

/**
 * Assigning training to people.
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise. Both satisfy the same type, so nothing
 * downstream of this file knows or cares which is in play.
 */
export const assignmentService = pick(supabaseImpl, demoImpl)

export type { AssignmentRow } from './demo/assignmentService'
