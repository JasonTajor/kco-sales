import { supabase } from '@/lib/supabase'

/**
 * Writes an audit entry (§38).
 *
 * Routed through the `log_activity` RPC rather than an insert, because the RLS
 * policy on activity_logs denies inserts to sales users - they must not be
 * able to forge an entry, but their genuine actions still need recording. The
 * function is SECURITY DEFINER and stamps `actor_id` from `auth.uid()`, so the
 * actor cannot be spoofed either.
 *
 * Deliberately swallows failures. An audit write must never be the reason a
 * user's action appears to have failed; the action itself has already
 * committed by the time this runs.
 */
export async function logActivity(
  action: string,
  entityType: string,
  entityId: string | null,
  label: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase) return
  try {
    await supabase.rpc('log_activity', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_target_label: label,
      p_meta: meta as never,
    })
  } catch {
    /* audit logging is best-effort by design */
  }
}
