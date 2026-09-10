import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-hair text-base">
        {items.map((c, i) => {
          const last = i === items.length - 1
          // A phone has no room for a full trail; every crumb shortens to a
          // stub and none of them is readable. Below `sm` only the current page
          // and the one above it are shown, and only the current page truncates.
          const deep = i < items.length - 2
          return (
            <Fragment key={`${c.label}-${i}`}>
              <li className={cn(last ? 'min-w-0' : 'shrink-0 whitespace-nowrap', deep && 'hidden sm:block')}>
                {c.to && !last ? (
                  <Link
                    to={c.to}
                    className="touch-target relative rounded-sm text-fg-secondary transition-colors hover:text-fg"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={last ? 'block truncate font-medium text-fg' : 'text-fg-secondary'}
                  >
                    {c.label}
                  </span>
                )}
              </li>
              {!last && (
                <ChevronRight
                  className={cn('size-3.5 shrink-0 text-fg-tertiary', deep && 'hidden sm:block')}
                  aria-hidden
                />
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
