import { pick } from './backend'
import { notificationService as supabaseImpl } from './supabase/notificationService'
import { notificationService as demoImpl } from './demo/notificationService'

/**
 * In-app notifications.
 *
 * Selects the Supabase implementation when a project is configured and the
 * offline demo store otherwise. Both satisfy the same type, so nothing
 * downstream of this file knows or cares which is in play.
 */
export const notificationService = pick(supabaseImpl, demoImpl)
