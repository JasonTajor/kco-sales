import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, CircleDashed, Layers } from 'lucide-react'
import type { Material, MaterialProgress } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAsync } from '@/hooks/useAsync'
import { gamificationService, materialService, progressService } from '@/services'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { StatTile } from '@/components/common/StatTile'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { MaterialSkeleton, Skeleton } from '@/components/ui/skeleton'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { XPBadge } from '@/components/gamification/Stats'
import { cn } from '@/lib/cn'

/**
 * A learning path (§26).
 *
 * An ordered reading list, presented as one. The previous version drew this as
 * a game-style node map with locked steps and XP per node; §5 rules that out,
 * and the ordering was never actually enforced - a learner could open any
 * published material directly. Showing a numbered sequence with real progress
 * against it is both calmer and more honest.
 */
export function PathDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const userId = user!.id

  // The path itself now comes from the service, so a path an admin edits or
  // unpublishes is reflected here rather than read from the seed file.
  const pathAsync = useAsync(() => materialService.path(slug ?? ''), [slug])
  const path = pathAsync.data ?? null

  const materials = useAsync(
    () => materialService.list({ status: 'published' }),
    [slug],
  )
  const progress = useAsync(() => progressService.forUser(userId), [userId, slug])

  // Wait for the fetch before deciding the path does not exist, or a reload
  // would flash the 404 page.
  if (pathAsync.loading) return <MaterialSkeleton />
  if (!path) return <NotFoundPage />

  const byId = new Map((progress.data ?? []).map((p) => [p.materialId, p]))

  // Preserve the path's own ordering rather than the library's.
  const steps = path.materialIds
    .map((id) => (materials.data ?? []).find((m) => m.id === id))
    .filter((m): m is Material => Boolean(m))

  const completed = steps.filter((m) => byId.get(m.id)?.state === 'completed').length
  const pathXp = steps.reduce((sum, m) => sum + gamificationService.pendingXp(userId, m), 0)
  const percent = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0
  const next = steps.find((m) => byId.get(m.id)?.state !== 'completed')

  const loading = materials.loading || progress.loading
  const error = pathAsync.error ?? materials.error ?? progress.error

  return (
    <Page>
      <PageHeader
        title={path.title}
        description={path.description}
        crumbs={[
          { label: 'Learning', to: '/learning/materials' },
          { label: 'Learning paths', to: '/learning/paths' },
          { label: path.title },
        ]}
        meta={
          <>
            <Badge tone="neutral">{steps.length || path.materialIds.length} modules</Badge>
            <Badge tone="neutral">{path.estimatedMinutes} min</Badge>
            {pathXp > 0 && <XPBadge xp={pathXp} size="sm" />}
            <Badge tone={path.status === 'published' ? 'success' : 'neutral'}>{path.status}</Badge>
          </>
        }
        actions={
          next ? (
            <LinkButton to={`/learning/materials/${next.slug}`}>
              {completed === 0 ? 'Start path' : 'Continue'}
              <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
          ) : steps.length > 0 ? (
            <Badge tone="success">
              <Check className="size-3" aria-hidden />
              Path complete
            </Badge>
          ) : undefined
        }
      />

      {error && <ErrorState description={error.message} onRetry={materials.reload} />}

      {!error && (
        <>
          <section className="grid gap-group sm:grid-cols-3">
            <StatTile
              label="Progress"
              value={percent}
              unit="%"
              hint={`${completed} of ${steps.length} modules complete`}
            />
            <StatTile label="Modules" value={steps.length} hint="In this path, in order" />
            <StatTile
              label="Estimated"
              value={path.estimatedMinutes}
              unit="min"
              hint="Total reading time"
            />
          </section>

          <Card>
            <CardHeader
              title="Path contents"
              description="Work through these in order. Each one is also available on its own from the library."
            />

            {loading ? (
              <div className="space-y-tight p-card">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : steps.length === 0 ? (
              <EmptyState
                icon={<Layers className="size-5" />}
                title="No modules available yet"
                description="This path references modules that are not published. A trainer needs to publish them before the path can be started."
              />
            ) : (
              <ol className="divide-y divide-line">
                {steps.map((m, i) => (
                  <PathStep
                    key={m.id}
                    index={i + 1}
                    material={m}
                    progress={byId.get(m.id)}
                    isNext={next?.id === m.id}
                    userId={userId}
                  />
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </Page>
  )
}

function PathStep({
  index,
  material,
  progress,
  isNext,
  userId,
}: {
  index: number
  material: Material
  progress?: MaterialProgress
  isNext: boolean
  userId: string
}) {
  const done = progress?.state === 'completed'
  const started = progress?.state === 'in-progress'
  const sectionsDone = progress?.completedSectionIds.length ?? 0
  const total = material.sections.length
  const percent = total > 0 ? Math.round((sectionsDone / total) * 100) : 0

  return (
    <li>
      <Link
        to={`/learning/materials/${material.slug}`}
        data-emoji-group
        className={cn(
          'flex items-center gap-group px-card py-tight transition-colors hover:bg-surface-hover',
          isNext && 'bg-primary-subtle/40',
        )}
      >
        {/* The step marker carries state, so it is the one place colour is
            allowed to mean something in this list. */}
        {/* The step marker carries state, so it is the one place colour is
            allowed to mean something in this list. */}
        <span
          aria-hidden
          className={cn(
            'flex size-9 flex-none items-center justify-center rounded-xl text-sm font-extrabold',
            done
              ? 'face-chunky [--face:var(--success)]'
              : started
                ? 'face-chunky [--face:var(--cta)] motion-safe:animate-node-pulse'
                : 'tile-chunky [--tile-base:var(--primary)]',
          )}
          data-face="soft"
        >
          {done ? (
            <Check className="size-4.5 text-white" />
          ) : started ? (
            <CircleDashed className="size-4 text-white" />
          ) : (
            index
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-tight">
            <span className="truncate text-sm font-medium text-fg">{material.title}</span>
            {isNext && !done && <Badge tone="info">Next</Badge>}
          </span>
          <span className="mt-hair block text-xs text-fg-tertiary">
            {material.duration} min · {total} section{total === 1 ? '' : 's'}
            {sectionsDone > 0 && !done && ` · ${sectionsDone} done`}
          </span>
        </span>

        {!done && (
          <XPBadge
            xp={gamificationService.pendingXp(userId, material)}
            size="sm"
            className="hidden shrink-0 sm:inline-flex"
          />
        )}

        <span className="hidden w-24 flex-none sm:block">
          <ProgressBar value={percent} label={`${material.title} progress`} />
        </span>

        <ArrowRight className="size-4 flex-none text-fg-tertiary" aria-hidden />
      </Link>
    </li>
  )
}
