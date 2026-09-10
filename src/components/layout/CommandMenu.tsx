import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { BookMarked, LogOut, Moon, Search, Sun, Zap } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { navigationFor } from '@/config/nav'
import { usePermissions } from '@/features/auth/PermissionProvider'
import { materialService, resourceService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useTheme } from '@/hooks/useTheme'
import { Kbd, modKey } from '@/components/ui/kbd'

/**
 * ⌘K palette. Navigation, then content - an agent mid-call should reach a
 * script in two keystrokes rather than three clicks.
 */
export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { mode, setMode, isDark } = useTheme()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const { keys } = usePermissions()
  const navItems = useMemo(
    () => (user ? navigationFor(user.role, keys).flatMap((g) => g.items) : []),
    [user, keys],
  )

  /**
   * Global search (§37) over real content.
   *
   * Loaded only once the menu has been opened, and then kept - the palette is
   * behind Ctrl+K, so fetching three libraries on every page load to serve a
   * shortcut most sessions never press would be waste. `useAsync` re-runs on
   * the `open` dependency, and the results persist while the dialog is closed.
   */
  const materialsAsync = useAsync(
    () => (open ? materialService.list({}) : Promise.resolve([])),
    [open],
  )
  const referenceAsync = useAsync(
    () => (open ? resourceService.quickReference() : Promise.resolve([])),
    [open],
  )
  const objectionsAsync = useAsync(
    () => (open ? resourceService.objections({}) : Promise.resolve([])),
    [open],
  )

  const materials = materialsAsync.data ?? []
  const quickReferenceCards = referenceAsync.data ?? []
  const objections = objectionsAsync.data ?? []

  const go = (to: string) => {
    onOpenChange(false)
    navigate(to)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command menu"
      shouldFilter
      overlayClassName="fixed inset-0 z-[90] animate-overlay-in bg-black/40 backdrop-blur-[1px] dark:bg-black/60"
      contentClassName="fixed left-1/2 top-[12vh] z-[91] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 animate-dialog-in overflow-hidden rounded-xl border border-line bg-surface-raised shadow-lg focus:outline-none"
    >
      <div className="flex items-center gap-snug border-b border-line px-card">
        <Search className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search pages, materials, scripts…"
          className="h-11 w-full bg-transparent text-md text-fg outline-none placeholder:text-fg-tertiary"
        />
        <Kbd>Esc</Kbd>
      </div>

      <Command.List className="max-h-[52vh] overflow-y-auto p-tight scrollbar-thin">
        <Command.Empty className="px-card py-8 text-center text-base text-fg-secondary">
          No matches for “{search}”.
        </Command.Empty>

        <Group heading="Go to">
          {navItems.map((item) => (
            <Item key={item.to} onSelect={() => go(item.to)}>
              <item.icon className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
              {item.label}
            </Item>
          ))}
        </Group>

        <Group heading="Materials">
          {materials.map((m) => (
            <Item key={m.id} value={`${m.title} ${m.tags.join(' ')}`} onSelect={() => go(`/learning/materials/${m.slug}`)}>
              <BookMarked className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
              <span className="truncate">{m.title}</span>
              <span className="ml-auto shrink-0 text-2xs text-fg-tertiary">Module {m.moduleNumber}</span>
            </Item>
          ))}
        </Group>

        <Group heading="Quick reference">
          {quickReferenceCards.map((c) => (
            <Item key={c.id} value={`${c.title} ${c.kicker}`} onSelect={() => go('/learning/quick-reference')}>
              <Zap className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
              <span className="truncate">{c.title}</span>
              <span className="ml-auto shrink-0 text-2xs text-fg-tertiary">{c.kicker}</span>
            </Item>
          ))}
        </Group>

        <Group heading="Objections">
          {objections.map((o) => (
            <Item key={o.id} value={`${o.objection} ${o.translation}`} onSelect={() => go('/resources/objections')}>
              <span className="w-4 shrink-0 text-center text-fg-tertiary" aria-hidden>
                “
              </span>
              <span className="truncate">{o.objection}</span>
              <span className="ml-auto shrink-0 truncate text-2xs text-fg-tertiary">{o.translation}</span>
            </Item>
          ))}
        </Group>

        <Group heading="Actions">
          <Item
            onSelect={() => {
              setMode(isDark ? 'light' : 'dark')
              onOpenChange(false)
            }}
          >
            {isDark ? <Sun className="size-4 text-fg-tertiary" /> : <Moon className="size-4 text-fg-tertiary" />}
            Switch to {isDark ? 'light' : 'dark'} theme
            <span className="ml-auto text-2xs text-fg-tertiary">Currently {mode}</span>
          </Item>
          <Item
            onSelect={() => {
              onOpenChange(false)
              void signOut()
            }}
          >
            <LogOut className="size-4 text-fg-tertiary" aria-hidden />
            Sign out
          </Item>
        </Group>
      </Command.List>

      <div className="flex items-center justify-between border-t border-line bg-bg px-card py-tight text-2xs text-fg-tertiary">
        <span className="flex items-center gap-tight">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          to navigate
        </span>
        <span className="flex items-center gap-tight">
          <Kbd>↵</Kbd>
          to open
          <span className="mx-hair text-line-strong">·</span>
          <Kbd>{modKey} K</Kbd>
          to toggle
        </span>
      </div>
    </Command.Dialog>
  )
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-tight [&_[cmdk-group-heading]]:pb-hair [&_[cmdk-group-heading]]:pt-snug [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-tertiary"
    >
      {children}
    </Command.Group>
  )
}

function Item({
  children,
  onSelect,
  value,
}: {
  children: React.ReactNode
  onSelect: () => void
  value?: string
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex h-8 cursor-pointer select-none items-center gap-snug rounded-md px-tight text-base text-fg-secondary data-[selected=true]:bg-surface-hover data-[selected=true]:text-fg"
    >
      {children}
    </Command.Item>
  )
}
