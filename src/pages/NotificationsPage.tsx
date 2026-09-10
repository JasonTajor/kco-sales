import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, Megaphone } from 'lucide-react'
import type { Notification } from '@/types'
import type { Announcement } from '@/types/resources'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAsync } from '@/hooks/useAsync'
import { notificationService, resourceService } from '@/services'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Notifications and announcements (§34, §35).
 *
 * Both on one page because they answer the same question - "what do I need to
 * know" - and separating them would mean two places to check. Announcements
 * come first: they are broadcast and usually time-sensitive, where a
 * notification is a record of something that already happened to you.
 */
export function NotificationsPage() {
  const { user } = useAuth()
  const userId = user!.id
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const notifications = useAsync(() => notificationService.list(userId), [userId])
  const announcements = useAsync(() => resourceService.announcements(), [])

  const unread = (notifications.data ?? []).filter((n) => !n.read)

  const markAll = async () => {
    setBusy(true)
    try {
      await notificationService.markAllRead(userId)
      notifications.reload()
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update notifications.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Notifications"
        description="Assignments, results and announcements for you."
        meta={unread.length > 0 ? <Badge tone="info">{unread.length} unread</Badge> : undefined}
        actions={
          unread.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAll} disabled={busy}>
              <CheckCheck className="size-4" aria-hidden />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {(announcements.data ?? []).length > 0 && (
        <Card>
          <CardHeader title="Announcements" description="Posted by your trainers." />
          <ul className="divide-y divide-line">
            {announcements.data!.map((a) => (
              <AnnouncementRow key={a.id} announcement={a} />
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Your notifications" />

        {notifications.loading ? (
          <div className="space-y-tight p-card">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : notifications.error ? (
          <ErrorState description={notifications.error.message} onRetry={notifications.reload} />
        ) : (notifications.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Bell className="size-5" />}
            title="Nothing yet"
            description="You will be notified here when training is assigned to you, when an assessment is scored, and when a trainer posts an announcement."
          />
        ) : (
          <ul className="divide-y divide-line">
            {notifications.data!.map((n) => (
              <NotificationRow key={n.id} notification={n} onRead={notifications.reload} />
            ))}
          </ul>
        )}
      </Card>
    </Page>
  )
}

function AnnouncementRow({ announcement }: { announcement: Announcement }) {
  return (
    <li className="space-y-hair px-card py-tight">
      <div className="flex flex-wrap items-center gap-tight">
        <Megaphone className="size-3.5 flex-none text-fg-tertiary" aria-hidden />
        <p className="text-sm font-medium text-fg">{announcement.title}</p>
        {announcement.priority !== 'normal' && (
          <Badge tone={announcement.priority === 'critical' ? 'danger' : 'warning'}>
            {announcement.priority}
          </Badge>
        )}
        {announcement.publishedAt && (
          <span className="text-xs text-fg-tertiary">{relativeTime(announcement.publishedAt)}</span>
        )}
      </div>
      {announcement.content && (
        <p className="whitespace-pre-line text-sm text-fg-secondary">{announcement.content}</p>
      )}
    </li>
  )
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: () => void
}) {
  const markRead = () => {
    if (notification.read) return
    void notificationService.markRead(notification.id).then(onRead)
  }

  const body = (
    <>
      {/* An unread dot rather than a coloured row: a list where half the rows
          are tinted is harder to read, not easier. */}
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-1.5 flex-none rounded-full',
          notification.read ? 'bg-transparent' : 'bg-primary',
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm',
            notification.read ? 'text-fg-secondary' : 'font-medium text-fg',
          )}
        >
          {notification.title}
        </span>
        {notification.body && (
          <span className="mt-hair block text-xs text-fg-tertiary">{notification.body}</span>
        )}
      </span>
      <span className="shrink-0 text-xs text-fg-tertiary">
        {relativeTime(notification.createdAt)}
      </span>
    </>
  )

  return (
    <li>
      {notification.href ? (
        <Link
          to={notification.href}
          onClick={markRead}
          className="flex items-start gap-tight px-card py-tight transition-colors hover:bg-surface-hover"
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={markRead}
          className="flex w-full items-start gap-tight px-card py-tight text-left transition-colors hover:bg-surface-hover"
        >
          {body}
        </button>
      )}
    </li>
  )
}
