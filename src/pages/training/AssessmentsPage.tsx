import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useCurrentUser } from '@/features/auth/AuthProvider'
import { useAsync } from '@/hooks/useAsync'
import { assessmentService, materialService } from '@/services'

import { cn } from '@/lib/cn'
import { Stagger, StaggerItem } from '@/components/motion/Motion'
import { plural, relativeTime } from '@/lib/format'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Emoji } from '@/components/common/Emoji'
import { EmojiTile } from '@/components/common/EmojiTile'

export function AssessmentsPage() {
  const user = useCurrentUser()
  const assessments = useAsync(() => assessmentService.list(), [])
  const attempts = useAsync(() => assessmentService.attemptsFor(user.id), [user.id])

  // Module titles for the "tied to" line. From the service, so an assessment
  // linked to a module an admin renamed shows the new name.
  const materials = useAsync(() => materialService.list({ status: 'published' }), [])

  const rows = assessments.data ?? []
  const mine = attempts.data ?? []
  const library = materials.data ?? []

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Training' }, { label: 'Assessments' }]}
        title="Assessments"
        description="Short knowledge checks tied to each module. You can retake them until you pass."
      />

      {assessments.loading ? (
        <CardGridSkeleton count={4} />
      ) : assessments.error ? (
        <ErrorState onRetry={assessments.reload} />
      ) : rows.length === 0 ? (
        <EmptyState title="No assessments published yet" icon={<EmojiTile name="pencil" tone="lightblue" size="lg" play="loop" />} />
      ) : (
        <Stagger className="grid grid-cols-1 gap-group sm:grid-cols-2">
          {rows.map((a) => {
            const history = mine.filter((x) => x.assessmentId === a.id)
            const best = history.reduce<number | null>((max, x) => (max === null || x.score > max ? x.score : max), null)
            const passed = history.some((x) => x.passed)
            const material = a.materialId
              ? library.find((m) => m.id === a.materialId)
              : undefined
            const exhausted = history.length >= a.attemptsAllowed && !passed

            return (
              <StaggerItem key={a.id} className="h-full">
              <Link
                key={a.id}
                to={`/training/assessments/${a.slug}`}
                className="group flex flex-col chunk p-card chunk-press"
              >
                <div className="flex items-start justify-between gap-tight">
                  <div className="min-w-0">
                    <h2 className="text-md font-semibold tracking-[-0.01em] text-fg">{a.title}</h2>
                    {material && <p className="mt-hair text-xs text-fg-tertiary">From {material.title}</p>}
                  </div>
                  {passed ? (
                    <Badge tone="success" dot>
                      Passed
                    </Badge>
                  ) : history.length > 0 ? (
                    <Badge tone="warning" dot>
                      Not yet passed
                    </Badge>
                  ) : (
                    <Badge tone="neutral" dot>
                      Not started
                    </Badge>
                  )}
                </div>

                <p className="mt-tight text-sm leading-relaxed text-fg-secondary">{a.description}</p>

                <div className="mt-snug flex flex-wrap items-center gap-x-snug gap-y-tight text-xs text-fg-tertiary">
                  <span className="tnum">{plural(a.questions.length, 'question')}</span>
                  <span className="tnum">Pass at {a.passingScore}%</span>
                  {a.timeLimitMinutes && (
                    <span className="inline-flex items-center gap-hair">
                      <Emoji name="hourglass" size={13} />
                      {a.timeLimitMinutes} min
                    </span>
                  )}
                  <span className="inline-flex items-center gap-hair">
                    <Emoji name="clock" size={13} />
                    {history.length}/{a.attemptsAllowed} attempts
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between pt-group">
                  <span className={cn('text-sm', best === null ? 'text-fg-tertiary' : 'text-fg-secondary')}>
                    {best === null ? (
                      'No attempts yet'
                    ) : (
                      <>
                        Best score <span className="font-medium text-fg tnum">{best}%</span>
                        {history[0] && <> · {relativeTime(history[0].submittedAt)}</>}
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-hair text-sm font-medium text-primary">
                    {exhausted ? 'Review' : history.length ? 'Retake' : 'Start'}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </Page>
  )
}
