import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '@/features/auth/AuthProvider'
import { useAsync } from '@/hooks/useAsync'
import { materialService, progressService } from '@/services'
import { formatDuration, plural } from '@/lib/format'
import { categoryAccent } from '@/utils'
import { cn } from '@/lib/cn'
import { Stagger, StaggerItem } from '@/components/motion/Motion'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { EmojiTile } from '@/components/common/EmojiTile'

export function PathsPage() {
  const user = useCurrentUser()
  const progress = useAsync(() => progressService.forUser(user.id), [user.id])

  // From the service, so a path an admin creates or unpublishes is reflected
  // here. RLS already hides unpublished paths from a learner; the explicit
  // filter is what makes this correct for an admin too.
  const pathsAsync = useAsync(() => materialService.paths(), [])
  // The modules a path lists, so each card can show its contents. Fetched from
  // the service - reading the demo store here would show seed data even with
  // Supabase connected.
  const libraryAsync = useAsync(() => materialService.list({ status: 'published' }), [])

  const visible = (pathsAsync.data ?? []).filter(
    (p) => p.status === 'published' && p.audience.includes(user.role),
  )
  const rows = progress.data ?? []
  const library = libraryAsync.data ?? []

  const loading = progress.loading || (pathsAsync.loading && !pathsAsync.data)
  const error = pathsAsync.error ?? libraryAsync.error

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Learning' }, { label: 'Learning Paths' }]}
        title="Learning Paths"
        description="Ordered sequences of materials for a specific role or goal. Work through them top to bottom."
      />

      {error ? (
        <ErrorState description={error.message} onRetry={pathsAsync.reload} />
      ) : loading ? (
        <Stagger className="grid grid-cols-1 gap-group lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </Stagger>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No learning paths for your role yet"
          description="Your training lead will publish one when it is ready."
          icon={<EmojiTile name="flag" tone="ube" size="lg" play="loop" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-group lg:grid-cols-2">
          {visible.map((path) => {
            const materials = path.materialIds
              .map((id) => library.find((m) => m.id === id))
              .filter((m): m is NonNullable<typeof m> => Boolean(m))
            const done = materials.filter(
              (m) => rows.find((r) => r.materialId === m.id)?.state === 'completed',
            ).length
            const rate = Math.round((done / Math.max(1, materials.length)) * 100)
            const accent = categoryAccent(path.accent)

            return (
              <StaggerItem key={path.id} className="h-full">
              <Link
                key={path.id}
                to={`/learning/paths/${path.slug}`}
                className="group flex flex-col chunk p-card chunk-press"
              >
                <div className="flex items-start justify-between gap-snug">
                  <div className="min-w-0">
                    <div className="flex items-center gap-tight">
                      <span className={cn('size-1.5 rounded-full', accent.dot)} aria-hidden />
                      <h2 className="text-md font-semibold tracking-[-0.01em] text-fg">{path.title}</h2>
                    </div>
                    <p className="mt-hair text-sm leading-relaxed text-fg-secondary">{path.description}</p>
                  </div>
                  <ArrowRight
                    className="mt-hair size-4 shrink-0 text-fg-tertiary transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>

                <ol className="mt-snug space-y-hair">
                  {materials.map((m, i) => {
                    const state = rows.find((r) => r.materialId === m.id)?.state ?? 'not-started'
                    return (
                      <li key={m.id} className="flex items-center gap-tight text-sm">
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold leading-none tnum',
                            state === 'completed'
                              ? 'border-success bg-success text-white'
                              : state === 'in-progress'
                                ? 'border-info bg-info-subtle text-info'
                                : 'border-line-strong text-fg-tertiary',
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className={cn('truncate', state === 'completed' ? 'text-fg-tertiary' : 'text-fg-secondary')}>
                          {m.title}
                        </span>
                      </li>
                    )
                  })}
                </ol>

                <div className="mt-auto space-y-tight pt-group">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-tertiary">
                      {plural(materials.length, 'material')} · {formatDuration(path.estimatedMinutes)}
                    </span>
                    <span className="text-fg-secondary tnum">
                      {done}/{materials.length} complete
                    </span>
                  </div>
                  <ProgressBar value={rate} tone={rate === 100 ? 'success' : 'primary'} />
                </div>
              </Link>
              </StaggerItem>
            )
          })}
        </div>
      )}
    </Page>
  )
}
