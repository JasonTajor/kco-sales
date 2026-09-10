import { pick } from './backend'
import { rbacService as supabaseImpl } from './supabase/rbacService'
import { rbacService as demoImpl } from './demo/rbacService'

/**
 * Permissions and invitations.
 *
 * Access is a role plus a per-person permission set. Nobody signs themselves
 * up: an admin records an invitation with the access it carries, and the
 * person sets their own password against it.
 */
export const rbacService = pick(supabaseImpl, demoImpl)
