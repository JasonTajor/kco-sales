import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-shimmer rounded-md bg-bg-inset', className)} />
}

/*
 * Every skeleton below mirrors the geometry of the thing it stands in for -
 * same padding contract, same grid, same gaps - so content does not jump
 * sideways when the real rows arrive.
 */

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden chunk">
      <div className="flex gap-group border-b border-line bg-bg px-card py-row-y">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-group px-card py-row-y">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'flex-[1.6]' : 'flex-1')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-group sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-tight chunk p-card">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  )
}

export function MaterialSkeleton() {
  return (
    <div className="space-y-group">
      <div className="space-y-tight">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-3.5 w-full max-w-xl" />
      </div>
      <div className="space-y-tight">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={cn('h-3.5', i % 3 === 2 ? 'w-4/6' : 'w-full')} />
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="space-y-tight">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={cn('h-3.5', i % 2 ? 'w-5/6' : 'w-full')} />
        ))}
      </div>
    </div>
  )
}

/** Mirrors StatRow: separate chunk tiles on the group interval, not a hairline grid. */
export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-group sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-hair chunk p-card">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-14" />
        </div>
      ))}
    </div>
  )
}
