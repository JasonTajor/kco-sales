import { pick } from './backend'
import { userService as supabaseImpl } from './supabase/userService'
import { userService as demoImpl } from './demo/userService'

/**
 * People and their roles.
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise. Both satisfy the same type, so nothing
 * downstream of this file knows or cares which is in play.
 */
export const userService = pick(supabaseImpl, demoImpl)

export type { UserFilters } from './demo/userService'
