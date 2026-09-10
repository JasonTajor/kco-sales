import { pick } from './backend'
import { materialService as supabaseImpl } from './supabase/materialService'
import { materialService as demoImpl } from './demo/materialService'

/**
 * Learning content: modules, lessons, blocks, categories.
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise. Both satisfy the same type, so nothing
 * downstream of this file knows or cares which is in play.
 */
export const materialService = pick(supabaseImpl, demoImpl)

export type { MaterialFilters } from './demo/materialService'
