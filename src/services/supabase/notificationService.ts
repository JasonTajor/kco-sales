import type { Notification } from '@/types'
import { requireDb, unwrap } from '@/lib/supabase'
import type { notificationService as DemoApi } from '../demo/notificationService'
import { rowToNotification } from '../mappers'

/**
 * Notifications (§34).
 *
 * RLS scopes every row to its recipient, so `eq('user_id', ...)` is belt and
 * braces rather than the security boundary - it keeps the query planner using
 * the index and makes the intent obvious at the call site.
 */
export const notificationService: typeof DemoApi = {
  async list(userId: string): Promise<Notification[]> {
    const db = requireDb()
    const rows = unwrap(
      await db
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    )
    return rows.map(rowToNotification)
  },

  async unreadCount(userId: string): Promise<number> {
    const db = requireDb()
    // head + exact count: the bell needs the number, never the rows. Served by
    // the partial index on unread notifications.
    const { count, error } = await db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) throw new Error(error.message)
    return count ?? 0
  },

  async markRead(id: string): Promise<void> {
    const db = requireDb()
    const res = await db.from('notifications').update({ read: true }).eq('id', id)
    if (res.error) throw new Error(res.error.message)
  },

  async markAllRead(userId: string): Promise<void> {
    const db = requireDb()
    const res = await db
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (res.error) throw new Error(res.error.message)
  },
}
