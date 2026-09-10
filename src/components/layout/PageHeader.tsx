import type { ReactNode } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumbs'
import { cn } from '@/lib/cn'

/**
 * Every page opens the same way: where you are, what this is, what you can do.
 * Keeping it in one component is what makes 24 screens feel like one product.
 */
export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  meta,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  crumbs?: Crumb[]
  actions?: ReactNode
  /** Badges or counts that sit beneath the title. */
  meta?: ReactNode
  className?: string
}) {
  // The page title is the tab title. One source, no drift.
  useDocumentTitle(typeof title === 'string' ? title : undefined)

  return (
    <header className={cn('space-y-group', className)}>
      {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-group">
        <div className="min-w-0 space-y-hair">
          <h1 className="truncate text-3xl font-extrabold tracking-[-0.024em] text-cta sm:text-4xl">{title}</h1>
          {description && <p className="max-w-2xl text-md text-fg-secondary">{description}</p>}
          {/* Badges are a step further from the description than it is from
              the title, so they read as annotation rather than a third line. */}
          {meta && <div className="flex flex-wrap items-center gap-tight pt-hair">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-tight">{actions}</div>}
      </div>
    </header>
  )
}

/**
 * Standard page frame: consistent max width and vertical rhythm. The gutter is
 * the only interval that scales with the viewport - everything inside keeps a
 * fixed contract so panels never reflow their own alignment at a breakpoint.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1320px] space-y-rhythm px-gutter py-rhythm sm:px-gutter-sm lg:px-gutter-lg',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Filter strip above a list or table: search left, filters and actions right. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-tight', className)}>{children}</div>
}
