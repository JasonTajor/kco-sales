import { pick } from './backend'
import { resourceService as supabaseImpl } from './supabase/resourceService'
import { resourceService as demoImpl } from './demo/resourceService'

/**
 * Sales resources: scripts, objections, quick reference, professional wording,
 * competencies, the Sales Bible and announcements (§22, §24, §25, §32, §35, §45).
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise.
 */
export const resourceService = pick(supabaseImpl, demoImpl)
