import { Link } from 'react-router-dom'
import { BookMarked, ClipboardCheck, Star, TriangleAlert } from 'lucide-react'
import type { Material, MaterialProgress } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAsync } from '@/hooks/useAsync'
import {
  assessmentService,
  gamificationService,
  materialService,
  progressService,
} from '@/services'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { SegmentedControl } from '@/components/ui/tabs'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { CardField, CardList, CardListItem, DataTable, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatDate, relativeTime } from '@/lib/format'
import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { AchievementCard } from '@/components/gamification/AchievementCard'
import { DailyGoalCard } from '@/components/gamification/DailyGoalCard'
import { LevelMeter, StreakBadge, XPBadge } from '@/components/gamification/Stats'

/**
 * My Progress (§28).
 *
 * Everything here is read back from stored progress rather than derived in the
 * browser, so the numbers match what an admin sees in the reports. The three
 * tabs answer three separate questions - where am I in the library, what have
 * I been told to do, and how did I score - which is why they are tabs rather
 * than one long page.
 */
type Tab = 'journey' | 'library' | 'assigned' | 'results'

export function ProgressPage() {
  const { user } = useAuth()
  const userId = user!.id
  const [tab, setTab] = useState<Tab>('journey')

  const summary = useAsync(() => progressService.summary(userId), [userId])
  const materials = useAsync(
    () => materialService.list({ status: 'published', audience: 'sales' }),
    [userId],
  )
  const progress = useAsync(() => progressService.forUser(userId), [userId])
  const assignments = useAsync(() => progressService.assignmentsFor(userId), [userId])
  const attempts = useAsync(() => assessmentService.attemptsFor(userId), [userId])
  const assessments = useAsync(() => assessmentService.list(), [])
  const journey = useAsync(() => gamificationService.journey(userId), [userId])

  const byId = new Map((progress.data ?? []).map((p) => [p.materialId, p]))

  return (
    <Page>
      <PageHeader
        title="My progress"
        description="What you have completed, what is assigned to you, and how you scored."
      />

      <section className="grid gap-group sm:grid-cols-2 lg:grid-cols-4">
        {summary.loading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[88px] rounded-lg" />)
        ) : summary.error ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorState description={summary.error.message} onRetry={summary.reload} />
          </div>
        ) : (
          <>
            <StatTile
              label="Completed"
              value={summary.data!.completed}
              hint={`of ${(materials.data ?? []).length} published materials`}
            />
            <StatTile
              label="Library complete"
              value={summary.data!.completionRate}
              unit="%"
              hint={`${summary.data!.inProgress} in progress`}
            />
            <StatTile
              label="Time invested"
              value={Math.round(summary.data!.minutesLearned / 60)}
              unit="hrs"
              hint={`${summary.data!.minutesLearned} minutes of material completed`}
            />
            <StatTile
              label="Average score"
              value={summary.data!.averageScore ?? '—'}
              unit={summary.data!.averageScore === null ? undefined : '%'}
              hint={
                summary.data!.averageScore === null
                  ? 'No assessments taken'
                  : `${(attempts.data ?? []).length} attempt(s)`
              }
            />
          </>
        )}
      </section>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        ariaLabel="Progress view"
        options={[
          { value: 'journey', label: 'Journey' },
          { value: 'library', label: 'Library' },
          {
            value: 'assigned',
            label: `Assigned${
              (assignments.data ?? []).filter((a) => a.status !== 'completed').length
                ? ` (${(assignments.data ?? []).filter((a) => a.status !== 'completed').length})`
                : ''
            }`,
          },
          {
            value: 'results',
            label: `Results${(attempts.data ?? []).length ? ` (${(attempts.data ?? []).length})` : ''}`,
          },
        ]}
      />

      {tab === 'journey' && (
        <JourneyTab loading={journey.loading} journey={journey.data} />
      )}

      {tab === 'library' && (
        <LibraryTab
          loading={materials.loading || progress.loading}
          error={materials.error ?? progress.error}
          materials={materials.data ?? []}
          progress={byId}
        />
      )}

      {tab === 'assigned' && (
        <AssignedTab
          loading={assignments.loading}
          error={assignments.error}
          rows={assignments.data ?? []}
          materials={materials.data ?? []}
        />
      )}

      {tab === 'results' && (
        <ResultsTab
          loading={attempts.loading}
          error={attempts.error}
          attempts={attempts.data ?? []}
          assessments={assessments.data ?? []}
        />
      )}
    </Page>
  )
}

/* --------------------------------------------------------------- journey --- */

/**
 * The reward view of progress.
 *
 * Every figure here is derived from the same progress records the Library tab
 * lists, so the two can never disagree - XP is a presentation of completed
 * work, not a second ledger.
 */
function JourneyTab({
  loading,
  journey,
}: {
  loading: boolean
  journey?: {
    level: Parameters<typeof LevelMeter>[0]['level']
    streak: Parameters<typeof StreakBadge>[0]['streak']
    goal: Parameters<typeof DailyGoalCard>[0]['goal']
    achievements: Parameters<typeof AchievementCard>[0]['achievement'][]
    recentXp: { id: string; label: string; amount: number; at: string }[]
  }
}) {
  if (loading || !journey) return <Skeleton className="h-[420px] rounded-xl" />

  const earned = journey.achievements.filter((a) => a.percent >= 100)
  const locked = journey.achievements.filter((a) => a.percent < 100)

  return (
    <div className="space-y-rhythm">
      <div className="grid gap-group lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="chunk flex flex-col justify-center gap-group p-card">
          <LevelMeter level={journey.level} />
          <div className="meter">
            <div className="meter-fill bg-xp" style={{ width: `${journey.level.percent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-tight">
            <StreakBadge streak={journey.streak} />
            <span className="text-2xs text-fg-tertiary tnum">
              Longest {journey.streak.longest} day{journey.streak.longest === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <DailyGoalCard goal={journey.goal} streak={journey.streak} />
      </div>

      {journey.recentXp.length > 0 && (
        <Card>
          <CardHeader title="Recent XP" description="What earned it, and when." />
          <ul className="divide-y divide-line">
            {journey.recentXp.map((e) => (
              <li key={e.id} className="flex items-center gap-tight px-card py-row-y">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{e.label}</span>
                  <span className="block text-2xs text-fg-tertiary">{relativeTime(e.at)}</span>
                </span>
                <XPBadge xp={e.amount} size="sm" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="space-y-group">
        <h2 className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
          Achievements · {earned.length} of {journey.achievements.length}
        </h2>
        <div className="grid gap-group sm:grid-cols-2">
          {[...earned, ...locked].map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      </section>
    </div>
  )
}

/* --------------------------------------------------------------- library --- */

function LibraryTab({
  loading,
  error,
  materials,
  progress,
}: {
  loading: boolean
  error: Error | null
  materials: Material[]
  progress: Map<string, MaterialProgress>
}) {
  if (loading) return <Skeleton className="h-[320px] rounded-lg" />
  if (error) return <ErrorState description={error.message} />

  if (materials.length === 0) {
    return (
      <EmptyState
        icon={<BookMarked className="size-5" />}
        title="No published materials"
        description="Once a trainer publishes a module it will appear here with your progress against it."
      />
    )
  }

  return (
    <>
      <DataTable>
        <THead>
          <TR>
            <TH>Material</TH>
            <TH className="w-[7rem]">Sections</TH>
            <TH className="w-[10rem]">Progress</TH>
            <TH className="w-[8rem]">Status</TH>
            <TH className="w-[8rem]">Last opened</TH>
          </TR>
        </THead>
        <TBody>
          {materials.map((m) => {
            const p = progress.get(m.id)
            const done = p?.completedSectionIds.length ?? 0
            const total = m.sections.length
            const percent = total > 0 ? Math.round((done / total) * 100) : 0
            const state = p?.state ?? 'not-started'

            return (
              <TR key={m.id}>
                <TD>
                  <div className="flex items-center gap-tight">
                    {p?.favorite && (
                      <Star className="size-3.5 flex-none text-warning" aria-label="Favourite" />
                    )}
                    <Link
                      to={`/learning/materials/${m.slug}`}
                      className="min-w-0 truncate font-medium text-fg hover:underline"
                    >
                      {m.title}
                    </Link>
                  </div>
                </TD>
                <TD className="tabular-nums text-fg-secondary">
                  {done}/{total}
                </TD>
                <TD>
                  <ProgressBar value={percent} label={`${m.title} progress`} />
                </TD>
                <TD>
                  <Badge
                    tone={
                      state === 'completed' ? 'success' : state === 'in-progress' ? 'info' : 'neutral'
                    }
                  >
                    {state.replace('-', ' ')}
                  </Badge>
                </TD>
                <TD className="text-fg-tertiary">
                  {p?.lastViewedAt ? relativeTime(p.lastViewedAt) : '—'}
                </TD>
              </TR>
            )
          })}
        </TBody>
      </DataTable>

      <CardList>
        {materials.map((m) => {
          const p = progress.get(m.id)
          const done = p?.completedSectionIds.length ?? 0
          const total = m.sections.length
          const state = p?.state ?? 'not-started'
          return (
            <CardListItem key={m.id} title={m.title} to={`/learning/materials/${m.slug}`}>
              <CardField label="Sections">
                {done}/{total}
              </CardField>
              <CardField label="Status">{state.replace('-', ' ')}</CardField>
              <CardField label="Last opened">
                {p?.lastViewedAt ? relativeTime(p.lastViewedAt) : '—'}
              </CardField>
            </CardListItem>
          )
        })}
      </CardList>
    </>
  )
}

/* -------------------------------------------------------------- assigned --- */

function AssignedTab({
  loading,
  error,
  rows,
  materials,
}: {
  loading: boolean
  error: Error | null
  rows: {
    id: string
    targetId: string
    targetType: string
    dueAt: string
    status: string
    note?: string
    assignedAt: string
  }[]
  materials: Material[]
}) {
  if (loading) return <Skeleton className="h-[240px] rounded-lg" />
  if (error) return <ErrorState description={error.message} />

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="size-5" />}
        title="Nothing assigned"
        description="Your trainer has not assigned any training yet. Everything in the library is still open to you."
        action={<LinkButton to="/learning/materials">Browse the library</LinkButton>}
      />
    )
  }

  const find = (id: string) => materials.find((m) => m.id === id)

  return (
    <>
      <DataTable>
        <THead>
          <TR>
            <TH>Assigned work</TH>
            <TH className="w-[8rem]">Type</TH>
            <TH className="w-[9rem]">Due</TH>
            <TH className="w-[8rem]">Status</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((a) => {
            const material = find(a.targetId)
            const overdue = a.status === 'overdue'

            return (
              <TR key={a.id}>
                <TD>
                  {material ? (
                    <Link
                      to={`/learning/materials/${material.slug}`}
                      className="font-medium text-fg hover:underline"
                    >
                      {material.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-fg">Assigned content</span>
                  )}
                  {a.note && <p className="mt-hair text-xs text-fg-tertiary">{a.note}</p>}
                </TD>
                <TD className="capitalize text-fg-secondary">{a.targetType}</TD>
                <TD className={overdue ? 'font-medium text-danger-fg' : 'text-fg-secondary'}>
                  {a.dueAt ? formatDate(a.dueAt) : '—'}
                </TD>
                <TD>
                  <Badge tone={overdue ? 'danger' : a.status === 'completed' ? 'success' : 'neutral'}>
                    {overdue && <TriangleAlert className="size-3" aria-hidden />}
                    {a.status.replace('-', ' ')}
                  </Badge>
                </TD>
              </TR>
            )
          })}
        </TBody>
      </DataTable>

      <CardList>
        {rows.map((a) => {
          const material = find(a.targetId)
          return (
            <CardListItem
              key={a.id}
              title={material?.title ?? 'Assigned content'}
              to={material ? `/learning/materials/${material.slug}` : undefined}
            >
              <CardField label="Type">{a.targetType}</CardField>
              <CardField label="Due">{a.dueAt ? formatDate(a.dueAt) : '—'}</CardField>
              <CardField label="Status">{a.status.replace('-', ' ')}</CardField>
            </CardListItem>
          )
        })}
      </CardList>
    </>
  )
}

/* --------------------------------------------------------------- results --- */

function ResultsTab({
  loading,
  error,
  attempts,
  assessments,
}: {
  loading: boolean
  error: Error | null
  attempts: {
    id: string
    assessmentId: string
    score: number
    passed: boolean
    attemptNumber: number
    submittedAt: string
    points?: { earned: number; total: number }
  }[]
  assessments: { id: string; slug: string; title: string; passingScore: number }[]
}) {
  if (loading) return <Skeleton className="h-[240px] rounded-lg" />
  if (error) return <ErrorState description={error.message} />

  if (attempts.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="size-5" />}
        title="No assessment attempts"
        description="Take an assessment and your score, pass mark and answer review will be recorded here."
        action={<LinkButton to="/training/assessments">Browse assessments</LinkButton>}
      />
    )
  }

  return (
    <>
      <DataTable>
        <THead>
          <TR>
            <TH>Assessment</TH>
            <TH className="w-[6rem]">Attempt</TH>
            <TH className="w-[7rem]">Score</TH>
            <TH className="w-[7rem]">Pass mark</TH>
            <TH className="w-[8rem]">Result</TH>
            <TH className="w-[9rem]">Submitted</TH>
          </TR>
        </THead>
        <TBody>
          {attempts.map((a) => {
            const assessment = assessments.find((x) => x.id === a.assessmentId)
            return (
              <TR key={a.id}>
                <TD>
                  {assessment ? (
                    <Link
                      to={`/training/assessments/${assessment.slug}`}
                      className="font-medium text-fg hover:underline"
                    >
                      {assessment.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-fg">Assessment</span>
                  )}
                </TD>
                <TD className="tabular-nums text-fg-secondary">#{a.attemptNumber}</TD>
                <TD className="font-semibold tabular-nums text-fg">
                  {a.score}%
                  {a.points && (
                    <span className="ml-hair text-xs font-normal text-fg-tertiary">
                      ({a.points.earned}/{a.points.total})
                    </span>
                  )}
                </TD>
                <TD className="tabular-nums text-fg-tertiary">{assessment?.passingScore ?? '—'}%</TD>
                <TD>
                  <Badge tone={a.passed ? 'success' : 'danger'}>{a.passed ? 'Passed' : 'Failed'}</Badge>
                </TD>
                <TD className="text-fg-tertiary">{formatDate(a.submittedAt)}</TD>
              </TR>
            )
          })}
        </TBody>
      </DataTable>

      <CardList>
        {attempts.map((a) => {
          const assessment = assessments.find((x) => x.id === a.assessmentId)
          return (
            <CardListItem
              key={a.id}
              title={assessment?.title ?? 'Assessment'}
              to={assessment ? `/training/assessments/${assessment.slug}` : undefined}
            >
              <CardField label="Attempt">#{a.attemptNumber}</CardField>
              <CardField label="Score">{a.score}%</CardField>
              <CardField label="Result">{a.passed ? 'Passed' : 'Failed'}</CardField>
              <CardField label="Submitted">{formatDate(a.submittedAt)}</CardField>
            </CardListItem>
          )
        })}
      </CardList>
    </>
  )
}
