import { pick } from './backend'
import { assessmentAdminService as supabaseImpl } from './supabase/assessmentAdminService'
import { assessmentAdminService as demoImpl } from './demo/assessmentAdminService'

/**
 * Assessment authoring (§16). Admin-only; every write is refused by RLS or by
 * the guarded RPCs for a non-admin caller, independently of route protection.
 */
export const assessmentAdminService = pick(supabaseImpl, demoImpl)
