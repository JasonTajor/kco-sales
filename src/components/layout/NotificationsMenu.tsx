import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import type { Notification } from '@/types'
import { notificationService } from '@/services'
import { isDelivered, useNotificationPrefs } from '@/features/notifications/prefs'
import { useAsync } from '@/hooks/useAsync'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip } from '@/components/ui/tooltip'
import { Emoji } from '@/components/common/Emoji'

const kindTone: Record<Notification['kind'], string> = {
  assignment: 'bg-info',
  announcement: 'bg-primary',
  result: 'bg-success',
  content: 'bg-warning',
  mention: 'bg-fg-tertiary',
}

export function NotificationsMenu({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { prefs } = useNotificationPrefs()
  const { data, loading, reload, setData } = useAsync<Notification[]>(
    () => notificationService.list(userId),
    [userId],
  )

  const items = useMemo(
    () => (data ?? []).filter((n) => isDelivered(n.kind, prefs)),
    [data, prefs],
  )
  const unread = items.filter((n) => !n.read).length

  const markAll = useCallback(async () => {
    await notificationService.markAllRead(userId)
    setData((prev) => (prev ?? []).map((n) => ({ ...n, read: true })))
  }, [userId, setData])

  const muted = (data ?? []).length - items.length

  const openItem = useCallback(
    async (n: Notification) => {
      if (!n.read) {
        await notificationService.markRead(n.id)
        setData((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      }
      if (n.href) {
        setOpen(false)
        navigate(n.href)
      }
    },
    [navigate, setData],
  )

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) reload()
      }}
    >
      <Tooltip content="Notifications" disabled={open}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
            <span className="relative">
              <Emoji name="bell" size={18} play={unread > 0 ? 'loop' : 'hover'} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-danger ring-2 ring-surface" />
              )}
            </span>
          </Button>
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent className="w-[340px] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between border-b border-line px-card py-tight">
          <p className="text-base font-semibold text-fg">
            Notifications
            {unread > 0 && <span className="ml-tight text-sm font-normal text-fg-tertiary">{unread} unread</span>}
          </p>
          {unread > 0 && (
            <Button variant="ghost" size="xs" icon={<CheckCheck className="size-3.5" />} onClick={markAll}>
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto scrollbar-thin">
          {loading && <p className="px-card py-8 text-center text-sm text-fg-tertiary">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="flex flex-col items-center gap-tight px-card py-8 text-center text-sm text-fg-secondary">
              <Emoji name="clover" size={28} play="loop" />
              You are all caught up.
            </p>
          )}
          <ul>
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void openItem(n)}
                  className={cn(
                    'flex w-full gap-snug border-b border-line px-card py-row-y text-left transition-colors last:border-b-0 hover:bg-surface-hover',
                    !n.read && 'bg-primary-subtle',
                  )}
                >
                  <span className={cn('mt-tight size-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : kindTone[n.kind])} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-tight">
                      <span className={cn('truncate text-base', n.read ? 'text-fg-secondary' : 'font-medium text-fg')}>
                        {n.title}
                      </span>
                      <span className="shrink-0 text-2xs text-fg-tertiary">{relativeTime(n.createdAt)}</span>
                    </span>
                    <span className="mt-hair line-clamp-2 block text-sm text-fg-secondary">{n.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {muted > 0 && (
          <p className="border-t border-line px-card py-tight text-2xs text-fg-tertiary">
            {muted} hidden by your notification settings.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
