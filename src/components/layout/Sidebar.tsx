import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { Role } from '@/types'
import { navigationFor } from '@/config/nav'
import { usePermissions } from '@/features/auth/PermissionProvider'
import { cn } from '@/lib/cn'
import { Tooltip } from '@/components/ui/tooltip'
import { Logo } from '@/components/common/Logo'

export function Sidebar({
  role,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: {
  role: Role
  collapsed: boolean
  onToggleCollapsed: () => void
  onNavigate?: () => void
}) {
  /*
   * Permission-filtered, so the sidebar never offers a link that would bounce
   * straight to /forbidden.
   *
   * When the permission set could not be loaded, pass undefined instead of an
   * empty set: that shows everything the role allows, matching the guard's own
   * fallback. An empty set would silently hide the entire admin console from an
   * administrator over one failed request.
   */
  const { keys, loadError } = usePermissions()
  const groups = navigationFor(role, loadError ? undefined : keys)

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        // No fill and no rule: the sidebar reads as part of the shell ground,
        // and the floating content panel is what separates the two.
        'flex h-full flex-col bg-transparent transition-[width] duration-150 ease-out',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <div className={cn('flex h-14 shrink-0 items-center gap-tight px-snug', collapsed && 'justify-center px-0')}>
        <Logo compact={collapsed} />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-snug pb-snug pt-tight scrollbar-thin">
        {groups.map((group, gi) => (
          <div
            key={group.heading ?? `group-${gi}`}
            data-tour={group.heading === 'Sales Resources' ? 'resources' : undefined}
            className={cn(gi > 0 && 'mt-rhythm')}
          >
            {group.heading && !collapsed && (
              <h2 className="mb-tight px-snug text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">
                {group.heading}
              </h2>
            )}
            {group.heading && collapsed && gi > 0 && <div className="mx-snug mb-snug h-px bg-line" />}

            <ul className="space-y-tight">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Tooltip content={item.label} side="right" disabled={!collapsed}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group flex h-11 items-center gap-snug rounded-lg px-snug text-base lg:h-9',
                          // The ring would vanish against the active item's fill at the global 1px offset.
                          'focus-visible:outline-offset-2',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? // Same chunky CTA as the primary buttons: flat face over a solid lip.
                              'btn-chunky font-semibold [--lip:3px]'
                            : 'font-medium text-fg-secondary transition-colors duration-75 hover:bg-surface-hover hover:text-fg',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={cn(
                              'size-[18px] shrink-0 transition-transform duration-100 group-hover:scale-110',
                              isActive ? 'text-cta-fg' : 'text-fg-tertiary group-hover:text-fg-secondary',
                            )}
                            aria-hidden
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shrink-0 p-snug">
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn(
              'flex h-11 w-full items-center gap-snug rounded-lg px-snug text-sm text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-fg lg:h-9',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </Tooltip>
      </div>
    </nav>
  )
}
