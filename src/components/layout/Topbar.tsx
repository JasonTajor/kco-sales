import { Menu, Search } from 'lucide-react'
import type { User } from '@/types'
import { Button } from '@/components/ui/button'
import { Kbd, modKey } from '@/components/ui/kbd'
import { NotificationsMenu } from './NotificationsMenu'
import { UserMenu } from './UserMenu'

export function Topbar({
  user,
  onOpenNav,
  onOpenCommand,
}: {
  user: User
  onOpenNav: () => void
  onOpenCommand: () => void
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-tight px-snug lg:px-card">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </Button>

      {/* Not an input: it opens the palette, so it must not look focusable-and-typable. */}
      <button
        type="button"
        onClick={onOpenCommand}
        data-tour="search"
        className="group flex h-8 w-full min-w-0 max-w-[280px] items-center gap-tight rounded-md border border-line bg-surface px-tight text-left text-fg-tertiary shadow-xs transition-colors hover:border-line-strong hover:text-fg-secondary"
      >
        <Search className="size-3.5 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-sm">Search…</span>
        <Kbd>{modKey} K</Kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-hair">
        <NotificationsMenu userId={user.id} />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
