import { NavLink } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { springUI } from '@/lib/motion'
import { BookMarked, Gauge, Home, Sparkles, Bookmark } from 'lucide-react'
import type { Role } from '@/types'
import { cn } from '@/lib/cn'

/**
 * Bottom navigation for touch. Five destinations maximum: past that, targets
 * shrink below 44px and the bar stops being usable one-handed.
 *
 * Admin work is not represented here on purpose. Managing users on a phone is
 * not a real workflow, and it is still reachable from the drawer.
 */
const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/learning/materials', label: 'Learn', icon: BookMarked },
  { to: '/training/practice', label: 'Practice', icon: Sparkles },
  { to: '/learning/quick-reference', label: 'Reference', icon: Bookmark },
  { to: '/progress', label: 'Progress', icon: Gauge },
]

export function MobileNav({ role }: { role: Role }) {
  const reduce = useReducedMotion()

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface backdrop-blur-md lg:hidden',
        // Clear the iOS home indicator.
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => (
          <li
            key={item.to}
            // The tour's resources step has no sidebar to point at on a phone,
            // so it borrows the Reference tab instead.
            data-tour={item.to === '/learning/quick-reference' ? 'mobile-reference' : undefined}
            className="flex-1"
          >
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-hair px-hair py-tight text-2xs font-medium transition-colors',
                  isActive ? 'font-bold text-cta' : 'text-fg-tertiary hover:text-fg-secondary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative flex h-8 w-14 items-center justify-center">
                    {isActive && !reduce && (
                      <motion.span
                        layoutId="mobile-nav-pill"
                        className="absolute inset-0 rounded-full bg-cta"
                        transition={springUI}
                        aria-hidden
                      />
                    )}
                    {isActive && reduce && (
                      <span className="absolute inset-0 rounded-full bg-cta" aria-hidden />
                    )}
                    <motion.span
                      className="relative z-10"
                      animate={reduce ? undefined : { scale: isActive ? 1.08 : 1 }}
                      transition={springUI}
                    >
                      <item.icon
                        className={cn('size-[19px]', isActive ? 'text-cta-fg' : undefined)}
                        aria-hidden
                      />
                    </motion.span>
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <span className="sr-only">{role === 'admin' ? 'Admin pages are in the side menu' : ''}</span>
    </nav>
  )
}
