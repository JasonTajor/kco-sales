import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookMarked,
  ClipboardCheck,
  FileStack,
  MessageSquareText,
  PhoneCall,
  ShieldQuestion,
  Target,
  TriangleAlert,
  UserCog,
  Users,
} from 'lucide-react'
import type { Material, MaterialProgress } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAsync } from '@/hooks/useAsync'
import {
  assessmentService,
  gamificationService,
  materialService,
  progressService,
  reportService,
} from '@/services'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/card'
import { StatTile } from '@/components/common/StatTile'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { relativeTime } from '@/lib/format'
import { Emoji } from '@/components/common/Emoji'
import { Mascot } from '@/components/gamification/Mascot'
import { DailyGoalCard } from '@/components/gamification/DailyGoalCard'
import { AchievementCard } from '@/components/gamification/AchievementCard'
import { LevelMeter, StreakBadge, XPBadge } from '@/components/gamification/Stats'

/**
 * The dashboard.
 *
 * Two entirely different pages behind one route, because an admin and a
 * learner open this screen with different questions. A learner asks "what
 * should I do next"; an admin asks "is the team keeping up". Merging them into
 * one grid of tiles would answer neither well.
 */
export function DashboardPage() {
  const { user, isAdmin } = useAuth()
  if (!user) return null
  return isAdmin ? <AdminDashboard /> : <LearnerDashboard />
}

/* ======================================================== learner (§29) === */

function LearnerDashboard() {
  const { user } = useAuth()
  const userId = user!.id

  const summary = useAsync(() => progressService.summary(userId), [userId])
  const recent = useAsync(() => progressService.recent(userId, 3), [userId])
  const assignments = useAsync(() => progressService.assignmentsFor(userId), [userId])
  const attempts = useAsync(() => assessmentService.attemptsFor(userId), [userId])
  const library = useAsync(
    () => materialService.list({ status: 'published', audience: 'sales', userId }),
    [userId],
  )
  const journey = useAsync(() => gamificationService.journey(userId), [userId])

  const firstName = user!.name.split(' ')[0]

  return (
    <Page>
      {/*
        The greeting carries the reward readouts rather than a separate strip
        of them: level, streak and today's goal are all answers to "how am I
        doing", so they belong beside the greeting that asks it.
      */}
      <section className="kco-gradient-fade -mx-gutter -mt-gutter px-gutter pb-rhythm pt-gutter sm:-mx-gutter-sm sm:px-gutter-sm">
        <div className="flex flex-wrap items-center gap-group">
          <Mascot pose="wave" size="md" float bloom />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold tracking-[-0.024em] text-fg sm:text-4xl">
              Good day, {firstName}
            </h1>
            <p className="mt-hair text-md text-fg-secondary">
              Your training, assignments and results.
            </p>
          </div>

          {journey.data && (
            <div className="flex flex-wrap items-center gap-group">
              <LevelMeter level={journey.data.level} />
              <StreakBadge streak={journey.data.streak} />
            </div>
          )}
        </div>

        {journey.data && (
          <DailyGoalCard
            className="mt-group"
            goal={journey.data.goal}
            streak={journey.data.streak}
          />
        )}
      </section>

      {/* The single most useful thing on the page, so it sits above the
          summary numbers rather than below them. */}
      <ContinueLearning
        loading={recent.loading}
        error={recent.error}
        items={recent.data ?? []}
      />

      <section data-tour="rewards" className="grid gap-group sm:grid-cols-2 lg:grid-cols-4">
        {summary.loading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[88px] rounded-lg" />)
        ) : summary.error ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorState description={summary.error.message} onRetry={summary.reload} />
          </div>
        ) : (
          <>
            <StatTile
              label="Library complete"
              value={summary.data!.completionRate}
              unit="%"
              hint={`${summary.data!.completed} of ${(library.data ?? []).length} materials`}
            />
            <StatTile
              label="In progress"
              value={summary.data!.inProgress}
              hint="Materials you have started"
            />
            <StatTile
              label="Assigned"
              value={summary.data!.assigned}
              tone={summary.data!.overdue > 0 ? 'warning' : 'neutral'}
              hint={
                summary.data!.overdue > 0
                  ? `${summary.data!.overdue} overdue`
                  : 'Nothing overdue'
              }
            />
            <StatTile
              label="Average score"
              value={summary.data!.averageScore ?? '—'}
              unit={summary.data!.averageScore === null ? undefined : '%'}
              hint={
                summary.data!.averageScore === null
                  ? 'No assessments taken yet'
                  : `Across ${(attempts.data ?? []).length} attempt(s)`
              }
            />
          </>
        )}
      </section>

      <div className="grid gap-rhythm lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-rhythm">
          <MyTraining
            loading={assignments.loading}
            error={assignments.error}
            rows={assignments.data ?? []}
            materials={library.data ?? []}
          />
          <RecentResults
            loading={attempts.loading}
            error={attempts.error}
            attempts={attempts.data ?? []}
          />
        </div>

        <div className="space-y-rhythm">
          <QuickResources />
          <RecentXp events={journey.data?.recentXp ?? []} loading={journey.loading} />
          <Achievements
            achievements={journey.data?.achievements ?? []}
            loading={journey.loading}
          />
          <Recommended
            loading={library.loading}
            materials={library.data ?? []}
            userId={userId}
          />
        </div>
      </div>
    </Page>
  )
}

function ContinueLearning({
  loading,
  error,
  items,
}: {
  loading: boolean
  error: Error | null
  items: { material: Material; progress: MaterialProgress }[]
}) {
  if (loading) return <Skeleton className="h-[104px] rounded-lg" />
  if (error) return null

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<BookMarked className="size-5" />}
          title="Nothing started yet"
          description="Open a material from the library and it will appear here so you can pick it back up."
          action={<LinkButton to="/learning/materials">Browse materials</LinkButton>}
        />
      </Card>
    )
  }

  const [current, ...rest] = items

  return (
    <section data-tour="next" className="space-y-group">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-tertiary">
        Continue learning
      </h2>

      <Link
        to={`/learning/materials/${current!.material.slug}`}
        className="chunk chunk-press block p-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-group">
          <div className="min-w-0 space-y-hair">
            <p className="text-2xs font-medium uppercase tracking-wider text-fg-tertiary">
              Module {current!.material.moduleNumber}
            </p>
            <p className="truncate text-lg font-semibold text-fg">{current!.material.title}</p>
            <p className="text-sm text-fg-secondary">
              {current!.progress.completedSectionIds.length} of{' '}
              {current!.material.sections.length} sections ·{' '}
              {relativeTime(current!.progress.lastViewedAt ?? current!.progress.startedAt ?? '')}
            </p>
          </div>
          <span className="flex items-center gap-tight text-sm font-medium text-fg">
            Resume
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
        <ProgressBar
          className="mt-group"
          value={sectionPercent(current!)}
          label={`${current!.material.title} progress`}
        />
      </Link>

      {rest.length > 0 && (
        <ul className="grid gap-tight sm:grid-cols-2">
          {rest.map(({ material, progress }) => (
            <li key={material.id}>
              <Link
                to={`/learning/materials/${material.slug}`}
                className="chunk chunk-press flex items-center justify-between gap-tight px-card py-row-y"
              >
                <span className="min-w-0 truncate text-sm font-medium text-fg">
                  {material.title}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-fg-tertiary">
                  {progress.completedSectionIds.length}/{material.sections.length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function sectionPercent(item: { material: Material; progress: MaterialProgress }): number {
  const total = item.material.sections.length
  if (total === 0) return 0
  return Math.round((item.progress.completedSectionIds.length / total) * 100)
}

function MyTraining({
  loading,
  error,
  rows,
  materials,
}: {
  loading: boolean
  error: Error | null
  rows: { id: string; targetId: string; targetType: string; dueAt: string; status: string }[]
  materials: Material[]
}) {
  const titleFor = (id: string) => materials.find((m) => m.id === id)?.title
  const slugFor = (id: string) => materials.find((m) => m.id === id)?.slug

  return (
    <Card>
      <CardHeader
        title="My training"
        description="Assigned to you by your trainer."
        action={
          rows.length > 0 ? (
            <LinkButton to="/progress" variant="ghost" size="sm">
              View all
            </LinkButton>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-tight p-card">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9" />)}
        </div>
      ) : error ? (
        <ErrorState description={error.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="size-5" />}
          title="No assigned training"
          description="When your trainer assigns a module or assessment, it will show up here with its due date."
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.slice(0, 6).map((a) => {
            const overdue = a.status === 'overdue'
            const label = titleFor(a.targetId) ?? 'Assigned content'
            const slug = slugFor(a.targetId)

            return (
              <li key={a.id} className="flex items-center gap-group px-card py-row-y">
                <div className="min-w-0 flex-1">
                  {slug ? (
                    <Link
                      to={`/learning/materials/${slug}`}
                      className="truncate text-sm font-medium text-fg hover:underline"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium text-fg">{label}</span>
                  )}
                  <p className="text-xs text-fg-tertiary">
                    {a.dueAt ? `Due ${relativeTime(a.dueAt)}` : 'No due date'}
                  </p>
                </div>
                <Badge tone={overdue ? 'danger' : a.status === 'completed' ? 'success' : 'neutral'}>
                  {a.status.replace('-', ' ')}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function RecentResults({
  loading,
  error,
  attempts,
}: {
  loading: boolean
  error: Error | null
  attempts: { id: string; assessmentId: string; score: number; passed: boolean; submittedAt: string }[]
}) {
  return (
    <Card>
      <CardHeader title="Assessment results" description="Your most recent attempts." />

      {loading ? (
        <div className="space-y-tight p-card">
          {Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-9" />)}
        </div>
      ) : error ? (
        <ErrorState description={error.message} />
      ) : attempts.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="size-5" />}
          title="No attempts yet"
          description="Take an assessment to see your score and review the answers."
          action={<LinkButton to="/training/assessments">Browse assessments</LinkButton>}
        />
      ) : (
        <ul className="divide-y divide-line">
          {attempts.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-center gap-group px-card py-row-y">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">Attempt {a.id.slice(0, 8)}</p>
                <p className="text-xs text-fg-tertiary">{relativeTime(a.submittedAt)}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-fg">{a.score}%</span>
              <Badge tone={a.passed ? 'success' : 'danger'}>{a.passed ? 'Passed' : 'Failed'}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** §29 - the four resources an agent reaches for mid-conversation. */
const QUICK_RESOURCES = [
  { to: '/resources/objections', label: 'Objection handling', icon: ShieldQuestion },
  { to: '/resources/phone-scripts', label: 'Phone scripts', icon: PhoneCall },
  { to: '/resources/chat-scripts', label: 'Chat scripts', icon: MessageSquareText },
  { to: '/learning/quick-reference', label: 'Quick reference', icon: Target },
] as const

function QuickResources() {
  return (
    <Card>
      <CardHeader title="Quick resources" description="For use during a live call or chat." />
      <ul className="divide-y divide-line">
        {QUICK_RESOURCES.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex items-center gap-tight px-card py-row-y text-sm text-fg transition-colors hover:bg-surface-hover"
            >
              <Icon className="size-4 text-fg-tertiary" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
              <ArrowRight className="size-3.5 text-fg-tertiary" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** The XP ledger: what earned it, and when. Derived, never stored. */
function RecentXp({
  events,
  loading,
}: {
  events: { id: string; label: string; amount: number; at: string }[]
  loading: boolean
}) {
  if (loading) return <Skeleton className="h-[160px] rounded-xl" />
  if (events.length === 0) return null

  return (
    <Card>
      <CardHeader title="Recent XP" description="Earned from work you actually did." />
      <ul className="divide-y divide-line">
        {events.map((e) => (
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
  )
}

/** The next three achievements worth chasing, closest first. */
function Achievements({
  achievements,
  loading,
}: {
  achievements: Parameters<typeof AchievementCard>[0]['achievement'][]
  loading: boolean
}) {
  if (loading) return <Skeleton className="h-[200px] rounded-xl" />
  if (achievements.length === 0) return null

  // Nearly-earned first, so the list is a to-do rather than a trophy cabinet.
  const next = [...achievements]
    .filter((a) => a.percent < 100)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 2)

  const earned = achievements.filter((a) => a.percent >= 100).length

  return (
    <section className="space-y-group">
      <div className="flex items-baseline justify-between gap-tight">
        <h2 className="flex items-center gap-tight text-xs font-bold uppercase tracking-wider text-fg-tertiary">
          <Emoji name="trophy" size={14} />
          Achievements
        </h2>
        <LinkButton to="/progress" variant="ghost" size="sm">
          {earned} earned
        </LinkButton>
      </div>

      {next.length === 0 ? (
        <Card>
          <p className="p-card text-sm text-fg-secondary">
            Every achievement earned. Nicely done.
          </p>
        </Card>
      ) : (
        <div className="space-y-group">
          {next.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      )}
    </section>
  )
}

function Recommended({
  loading,
  materials,
  userId,
}: {
  loading: boolean
  materials: Material[]
  userId: string
}) {
  // Unfinished material, shortest first - the recommendation that is most
  // likely to be acted on is the one that takes ten minutes.
  const suggestions = materials
    .filter((m) => {
      const p = progressService.peek(userId, m.id)
      return !p || p.state !== 'completed'
    })
    .sort((a, b) => a.duration - b.duration)
    .slice(0, 4)

  if (loading) return <Skeleton className="h-[180px] rounded-lg" />
  if (suggestions.length === 0) return null

  return (
    <Card>
      <CardHeader title="Recommended" description="Short modules you have not finished." />
      <ul className="divide-y divide-line">
        {suggestions.map((m) => (
          <li key={m.id}>
            <Link
              to={`/learning/materials/${m.slug}`}
              className="flex items-center gap-tight px-card py-row-y transition-colors hover:bg-surface-hover"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{m.title}</span>
                <span className="block text-xs text-fg-tertiary">{m.duration} min</span>
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-fg-tertiary" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ========================================================== admin (§30) === */

function AdminDashboard() {
  const overview = useAsync(() => reportService.overview(), [])
  const popular = useAsync(() => reportService.popularMaterials(5), [])
  const atRisk = useAsync(() => reportService.atRisk(5), [])
  const log = useAsync(() => reportService.activityLog({ limit: 8 }), [])

  return (
    <Page>
      <PageHeader
        title="Overview"
        description="Team training activity, content status and assessment performance."
        actions={
          <>
            <LinkButton to="/admin/content" variant="secondary" size="sm">
              <FileStack className="size-4" aria-hidden />
              Content
            </LinkButton>
            <LinkButton to="/admin/reports" size="sm">
              Reports
            </LinkButton>
          </>
        }
      />

      <section className="grid gap-group sm:grid-cols-2 lg:grid-cols-4">
        {overview.loading ? (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[88px] rounded-lg" />)
        ) : overview.error ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorState description={overview.error.message} onRetry={overview.reload} />
          </div>
        ) : (
          <>
            <StatTile
              label="Sales users"
              value={overview.data!.totalSalesUsers}
              hint={
                overview.data!.pendingUsers > 0
                  ? `${overview.data!.pendingUsers} awaiting activation`
                  : 'All accounts active'
              }
            />
            <StatTile
              label="Published"
              value={overview.data!.publishedMaterials}
              hint={`${overview.data!.draftMaterials} in draft`}
            />
            <StatTile
              label="Avg completion"
              value={overview.data!.trainingCompletion}
              unit="%"
              hint="Across published materials"
            />
            <StatTile
              label="Avg score"
              value={overview.data!.averageQuizScore || '—'}
              unit={overview.data!.averageQuizScore ? '%' : undefined}
              hint={`${overview.data!.assessmentsTaken} attempt(s), 30 days`}
            />
            <StatTile
              label="Overdue"
              value={overview.data!.overdueAssignments}
              tone={overview.data!.overdueAssignments > 0 ? 'warning' : 'neutral'}
              hint="Assignments past their due date"
            />
            <StatTile
              label="Lessons done"
              value={overview.data!.activeThisWeek}
              hint="Completed in the last 7 days"
            />
            <StatTile
              label="Claim review"
              value={overview.data!.claimReviewCount}
              tone={overview.data!.claimReviewCount > 0 ? 'warning' : 'neutral'}
              hint="Materials flagged for approval"
            />
            <StatTile label="Pending users" value={overview.data!.pendingUsers} hint="Not yet activated" />
          </>
        )}
      </section>

      <div className="grid gap-rhythm lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Needs attention"
            description="Learners with overdue work or low completion."
            action={
              <LinkButton to="/admin/reports" variant="ghost" size="sm">
                Reports
              </LinkButton>
            }
          />
          {atRisk.loading ? (
            <div className="space-y-tight p-card">
              {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : atRisk.error ? (
            <ErrorState description={atRisk.error.message} />
          ) : (atRisk.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title="Nobody flagged"
              description="No learner currently has overdue work or completion below 50%."
            />
          ) : (
            <ul className="divide-y divide-line">
              {atRisk.data!.map((l) => (
                <li key={l.userId} className="flex items-center gap-group px-card py-row-y">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{l.name}</p>
                    <p className="text-xs text-fg-tertiary">
                      {l.team} · active {relativeTime(l.lastActiveAt)}
                    </p>
                  </div>
                  {l.overdue > 0 && (
                    <Badge tone="danger">
                      <TriangleAlert className="size-3" aria-hidden />
                      {l.overdue} overdue
                    </Badge>
                  )}
                  <span className="w-10 text-right text-sm font-semibold tabular-nums text-fg">
                    {l.completionRate}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Most opened" description="Published materials by learners reached." />
          {popular.loading ? (
            <div className="space-y-tight p-card">
              {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : (popular.data ?? []).length === 0 ? (
            <EmptyState
              icon={<BookMarked className="size-5" />}
              title="No activity yet"
              description="Once learners start opening materials, the most-used ones appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {popular.data!.map((m) => (
                <li key={m.materialId} className="px-card py-row-y">
                  <div className="flex items-baseline justify-between gap-tight">
                    <p className="min-w-0 truncate text-sm font-medium text-fg">{m.title}</p>
                    <span className="shrink-0 text-xs tabular-nums text-fg-tertiary">
                      {m.completions}/{m.views}
                    </span>
                  </div>
                  <ProgressBar className="mt-tight" value={m.completionRate} label={`${m.title} completion`} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          description="Content and account changes."
          action={
            <LinkButton to="/admin/logs" variant="ghost" size="sm">
              Full log
            </LinkButton>
          }
        />
        {log.loading ? (
          <div className="space-y-tight p-card">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : (log.data ?? []).length === 0 ? (
          <EmptyState
            icon={<UserCog className="size-5" />}
            title="Nothing logged yet"
            description="Publishing content, changing a role or assigning training will appear here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {log.data!.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-tight gap-y-hair px-card py-tight text-sm"
              >
                <code className="rounded bg-bg-inset px-hair py-px font-mono text-2xs text-fg-secondary">
                  {e.action}
                </code>
                <span className="min-w-0 flex-1 truncate text-fg">{e.targetLabel}</span>
                <span className="shrink-0 text-xs text-fg-tertiary">{relativeTime(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  )
}
