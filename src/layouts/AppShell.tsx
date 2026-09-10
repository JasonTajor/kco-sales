import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { duration, easeOut } from '@/lib/motion'
import { TriangleAlert } from 'lucide-react'
import { useCurrentUser } from '@/features/auth/AuthProvider'
import { usePermissions } from '@/features/auth/PermissionProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { CommandMenu } from '@/components/layout/CommandMenu'
import { MobileNav } from '@/components/layout/MobileNav'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useHotkey } from '@/hooks/useHotkey'
import { cn } from '@/lib/cn'

/**
 * Announces a failed permission load.
 *
 * When the permission set cannot be fetched, the guards fall back to the
 * coarse role check so nobody is locked out. That is the right behaviour, but
 * it must not be silent: an admin would otherwise see the console working
 * while their fine-grained access is quietly not being applied.
 */
function PermissionLoadWarning() {
  const { loadError, reload } = usePermissions()
  if (!loadError) return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-tight border-b border-warning/30 bg-warning-subtle px-gutter py-tight text-xs text-warning-fg"
    >
      <TriangleAlert className="size-3.5 flex-none" aria-hidden />
      <span className="min-w-0 flex-1">
        Could not load your permissions ({loadError.message}). Access is falling back to your role,
        so some screens may look available that are not.
      </span>
      <button
        type="button"
        onClick={reload}
        className="font-bold underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  )
}

/**
 * Fixed sidebar, sticky topbar, scrolling content. The scroll container is the
 * <main>, not the window, so the sidebar never moves and long pages restore to
 * the top on navigation.
 */
export function AppShell() {
  const user = useCurrentUser()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [collapsed, setCollapsed] = useLocalStorage('kco.sidebar.collapsed', false)
  const [navOpen, setNavOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  useHotkey('k', (e) => {
    e.preventDefault()
    setCommandOpen((v) => !v)
  }, { mod: true, allowInInput: true })

  // Close the mobile drawer on navigation, and reset scroll on every route.
  useEffect(() => {
    setNavOpen(false)
    document.getElementById('app-main')?.scrollTo({ top: 0 })
  }, [location.pathname])

  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), [setCollapsed])

  return (
    <div className="flex h-full overflow-hidden bg-bg">
      <div className="hidden shrink-0 lg:block">
        <Sidebar role={user.role} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>

      {/* Mobile navigation drawer */}
      <div
        className={cn('fixed inset-0 z-40 lg:hidden', navOpen ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!navOpen}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity duration-150 dark:bg-black/60',
            navOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            // The sidebar itself is transparent now, so the drawer supplies the
            // fill it needs to sit over page content.
            'absolute inset-y-0 left-0 w-[248px] bg-bg transition-transform duration-200 ease-out',
            navOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <Sidebar
            role={user.role}
            collapsed={false}
            onToggleCollapsed={() => setNavOpen(false)}
            onNavigate={() => setNavOpen(false)}
          />
        </div>
      </div>

      {/* No fill on the content area: chrome and page share one flat ground. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onOpenNav={() => setNavOpen(true)} onOpenCommand={() => setCommandOpen(true)} />
        <PermissionLoadWarning />
        <main
          id="app-main"
          className="flex-1 overflow-y-auto pb-[72px] scrollbar-thin lg:pb-0"
        >
          {/* Route entrance. Deliberately short: it must never delay reading. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: duration.base, ease: easeOut }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNav role={user.role} />

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
