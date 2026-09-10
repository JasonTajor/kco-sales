import { pick } from './backend'
import { reportService as supabaseImpl } from './supabase/reportService'
import { reportService as demoImpl } from './demo/reportService'

/**
 * Admin reporting and the activity log.
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise. Both satisfy the same type, so nothing
 * downstream of this file knows or cares which is in play.
 */
export const reportService = pick(supabaseImpl, demoImpl)

export type {
  AdminOverview,
  AtRiskLearner,
  MaterialUsage,
  SeriesPoint,
  TeamCompletion,
} from './demo/reportService'
