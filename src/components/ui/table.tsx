import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * GitLab-style dense data table. Compact rows, hairline separators, subtle hover.
 * Wrapped so wide tables scroll inside their own container, never the page body.
 */
export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('hidden overflow-hidden chunk md:block', className)}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-left">{children}</table>
      </div>
    </div>
  )
}

/**
 * Mobile counterpart to DataTable. A row of columns is unreadable on a phone,
 * so below `md` the same records render as stacked cards and the table is
 * hidden. Callers provide both; neither is a horizontal scroll.
 */
export function CardList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('space-y-tight md:hidden', className)}>{children}</ul>
}

export function CardListItem({
  title,
  to,
  children,
  onClick,
  className,
}: {
  /** The row's heading - the equivalent of the table's first column. */
  title?: ReactNode
  /** Makes the heading a link. Prefer this over onClick for navigation, so
      the row is reachable by keyboard and openable in a new tab. */
  to?: string
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <li
      onClick={onClick}
      className={cn('chunk p-card', onClick && 'chunk-press cursor-pointer', className)}
    >
      {title !== undefined && (
        <p className="mb-tight text-sm font-semibold text-fg">
          {to ? (
            <Link to={to} className="hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </p>
      )}
      <dl className="field-grid">{children}</dl>
    </li>
  )
}

/**
 * Label/value pair inside a mobile card, mirroring a table column.
 *
 * Emits two grid cells rather than a wrapper, so every field in a card lines
 * its values up on one column - see `.field-grid` in globals.css.
 */
export function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-xs text-fg-tertiary">{label}</dt>
      <dd className="min-w-0 text-sm text-fg">{children}</dd>
    </>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line bg-bg">{children}</thead>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[var(--border)]">{children}</tbody>
}

export function TR({
  children,
  onClick,
  selected,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors duration-75',
        onClick && 'cursor-pointer',
        selected ? 'bg-primary-subtle' : 'hover:bg-surface-hover',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function TH({
  children,
  sortable,
  sortDir,
  onSort,
  className,
  width,
}: {
  children: ReactNode
  sortable?: boolean
  sortDir?: 'asc' | 'desc' | null
  onSort?: () => void
  className?: string
  width?: string
}) {
  const content = (
    <span className="inline-flex items-center gap-hair">
      {children}
      {sortable &&
        (sortDir === 'asc' ? (
          <ArrowUp className="size-3 text-fg" />
        ) : sortDir === 'desc' ? (
          <ArrowDown className="size-3 text-fg" />
        ) : (
          <ChevronsUpDown className="size-3 text-fg-tertiary opacity-0 transition-opacity group-hover/th:opacity-100" />
        ))}
    </span>
  )

  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      aria-sort={sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : undefined}
      className={cn(
        'group/th whitespace-nowrap px-card py-row-y text-xs font-bold uppercase tracking-wide text-fg-tertiary',
        className,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          // The UA stylesheet sets `text-transform: none` on buttons, which beats
          // inheritance - without this, sortable headers lose the uppercase that
          // the unsortable ones keep.
          className="inline-flex items-center gap-hair rounded-sm uppercase transition-colors hover:text-fg"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  )
}

export function TD({
  children,
  className,
  colSpan,
}: {
  children: ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td colSpan={colSpan} className={cn('px-card py-row-y align-middle text-base text-fg', className)}>
      {children}
    </td>
  )
}

/** Sticky bar that replaces the toolbar when rows are selected. */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number
  onClear: () => void
  children: ReactNode
}) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-group rounded-lg border border-primary/30 bg-primary-subtle px-card py-tight">
      <span className="text-base font-medium text-primary-subtle-fg tnum">
        {count} selected
      </span>
      <div className="ml-auto flex items-center gap-tight">
        {children}
        <button
          type="button"
          onClick={onClear}
          className="rounded-sm text-sm text-primary-subtle-fg underline-offset-2 hover:underline"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
