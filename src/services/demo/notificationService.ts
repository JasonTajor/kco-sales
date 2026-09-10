import type { Notification } from '@/types'
import { delay } from '@/lib/delay'
import { db, persistNotifications } from '../store'

export const notificationService = {
  async list(userId: string): Promise<Notification[]> {
    return delay(
      db.notifications
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      140,
    )
  },

  async unreadCount(userId: string): Promise<number> {
    return delay(db.notifications.filter((n) => n.userId === userId && !n.read).length, 60)
  },

  async markRead(id: string): Promise<void> {
    const n = db.notifications.find((x) => x.id === id)
    if (n) n.read = true
    persistNotifications()
    return delay(undefined, 80)
  },

  async markAllRead(userId: string): Promise<void> {
    db.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true
    })
    persistNotifications()
    return delay(undefined, 140)
  },
}
