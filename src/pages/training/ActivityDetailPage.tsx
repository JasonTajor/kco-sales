import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { Material, TrainingActivity } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { trainingService } from '@/services'
import { materialService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { IfRole } from '@/features/auth/guards'
import { DifficultyBadge } from '@/components/ui/status'
import { ErrorState } from '@/components/ui/states'
import { MaterialSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Emoji } from '@/components/common/Emoji'

export function ActivityDetailPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const toast = useToast()

  /**
   * The materials this activity points at.
   *
   * Fetched rather than imported so the links resolve against published
   * content. An activity referencing a module that was archived simply drops
   * out of the list rather than rendering a dead link.
   */
  const { data: relatedMaterials } = useAsync(
    () => materialService.list({ status: 'published' }),
    [],
  )
  const [done, setDone] = useState<Set<number>>(new Set())
  const [ran, setRan] = useState(false)

  const { data, loading, error, reload } = useAsync<TrainingActivity | null>(
    () => trainingService.activity(slug),
    [slug],
  )

  if (loading && !data) {
    return (
      <Page>
        <MaterialSkeleton />
      </Page>
    )
  }
  if (error) {
    return (
      <Page>
        <ErrorState onRetry={reload} />
      </Page>
    )
  }
  if (!data) return <NotFoundPage />

  const activity = data
  const linked = (activity.materials ?? [])
    .map((id) => (relatedMaterials ?? []).find((m) => m.id === id || m.slug === id))
    .filter((m): m is Material => Boolean(m))

  const toggleStep = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const markRan = async () => {
    await trainingService.markActivityRun(user!.id, activity)
    setRan(true)
    toast.success('Activity logged', `${activity.title} recorded in the activity log.`)
  }

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Training' }, { label: 'Activities', to: '/training/activities' }, { label: activity.title }]}
        title={activity.title}
        description={activity.objective}
        meta={
          <>
            <DifficultyBadge level={activity.difficulty} />
            <Badge tone="neutral">
              <Emoji name="hourglass" size={13} />
              {activity.durationMinutes} min
            </Badge>
            <Badge tone="neutral">
              <Emoji name="handshake" size={13} />
              {activity.participants}
            </Badge>
          </>
        }
        actions={
          <Button
            variant={ran ? 'subtle' : 'primary'}
            size="sm"
            onClick={() => void markRan()}
            disabled={ran}
            icon={ran ? <Check className="size-3.5 text-success" /> : <Emoji name="clapper" size={16} />}
          >
            {ran ? 'Logged' : 'Mark as run'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-rhythm lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-rhythm">
          <section>
            <h2 className="mb-snug text-lg font-semibold tracking-tight text-fg">How to run it</h2>
            <ol className="space-y-hair">
              {activity.instructions.map((step, i) => {
                const checked = done.has(i)
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => toggleStep(i)}
                      aria-pressed={checked}
                      className="flex w-full gap-snug rounded-md px-tight py-tight text-left transition-colors hover:bg-surface-hover"
                    >
                      <span
                        className={cn(
                          'mt-hair flex size-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold tnum transition-colors',
                          checked ? 'bg-success text-white' : 'bg-neutral-subtle text-fg-secondary',
                        )}
                        aria-hidden
                      >
                        {checked ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={cn('text-md leading-[1.6]', checked ? 'text-fg-tertiary line-through' : 'text-fg-secondary')}>
                        {step}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>

          <Callout variant="success" title="Expected outcome">
            {activity.expectedOutcome}
          </Callout>
        </div>

        <aside className="space-y-group">
          <IfRole allow={['admin']}>
            <Card className="p-0">
              <CardHeader title="Facilitator notes" description="Visible to administrators only." />
              <ul className="space-y-tight p-card">
                {activity.facilitatorNotes.map((note, i) => (
                  <li key={i} className="flex gap-tight text-sm leading-[1.55] text-fg-secondary">
                    <Emoji name="goal" size={14} className="mt-hair" />
                    {note}
                  </li>
                ))}
              </ul>
            </Card>
          </IfRole>

          {linked.length > 0 && (
            <Card className="p-0">
              <CardHeader title="Related materials" />
              <ul className="p-tight">
                {linked.map((m) => (
                  <li key={m.id}>
                    <LinkButton
                      to={`/learning/materials/${m.slug}`}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                    >
                      {m.title}
                    </LinkButton>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {activity.tags.length > 0 && (
            <div className="flex flex-wrap gap-tight">
              {activity.tags.map((t) => (
                <Badge key={t} tone="neutral">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </aside>
      </div>
    </Page>
  )
}
