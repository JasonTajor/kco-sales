import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { reportService } from '@/services'

import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { StatRow, StatTile } from '@/components/common/StatTile'
import { AreaChart } from '@/components/charts/AreaChart'
import { BarChart, StackedBar } from '@/components/charts/BarChart'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress'
import { SegmentedControl } from '@/components/ui/tabs'
import { CardField, CardList, CardListItem, DataTable, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { StatRowSkeleton, Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { Emoji } from '@/components/common/Emoji'

export function ReportsPage() {
  const toast = useToast()
  const [range, setRange] = useState<'7' | '14' | '30'>('14')

  const overview = useAsync(() => reportService.overview(), [])
  const activity = useAsync(() => reportService.learningActivity(Number(range)), [range])
  const teams = useAsync(() => reportService.completionByTeam(), [])
  const popular = useAsync(() => reportService.popularMaterials(8), [])
  const scores = useAsync(() => reportService.scoreDistribution(), [])
  const atRisk = useAsync(() => reportService.atRisk(10), [])

  /** Builds a CSV client-side - no backend needed for the preview. */
  const exportCsv = () => {
    const rows = [
      ['Team', 'Headcount', 'Completed', 'In progress', 'Not started', 'Completion rate'],
      ...(teams.data ?? []).map((t) => [
        t.team,
        t.headcount,
        t.completed,
        t.inProgress,
        t.notStarted,
        `${t.rate}%`,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kco-team-completion.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export ready', 'Team completion downloaded as CSV.')
  }

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Administration' }, { label: 'Reports & Analytics' }]}
        title="Reports & Analytics"
        description="Completion, engagement, and assessment performance across the sales organisation."
        actions={
          <>
            <SegmentedControl
              ariaLabel="Date range"
              value={range}
              onChange={setRange}
              options={[
                { value: '7', label: '7d' },
                { value: '14', label: '14d' },
                { value: '30', label: '30d' },
              ]}
            />
            <Button variant="secondary" size="md" icon={<Download className="size-3.5" />} onClick={exportCsv}>
              Export CSV
            </Button>
          </>
        }
      />

      {overview.loading || !overview.data ? (
        <StatRowSkeleton />
      ) : overview.error ? (
        <ErrorState onRetry={overview.reload} />
      ) : (
        <StatRow>
          <StatTile
            label="Training completion"
            value={overview.data.trainingCompletion}
            unit="%"
            hint={`${overview.data.totalSalesUsers} sales users`}
          />
          <StatTile
            label="Active this week"
            value={overview.data.activeThisWeek}
            hint={`of ${overview.data.totalSalesUsers} users`}
            icon={<Emoji name="handshake" size={15} />}
          />
          <StatTile
            label="Average quiz score"
            value={overview.data.averageQuizScore}
            unit="%"
            hint={`${overview.data.assessmentsTaken} attempts`}
          />
          <StatTile
            label="Overdue assignments"
            value={overview.data.overdueAssignments}
            hint={overview.data.overdueAssignments > 0 ? 'Needs follow-up' : 'All on track'}
            tone={overview.data.overdueAssignments > 0 ? 'danger' : 'success'}
          />
        </StatRow>
      )}

      <div className="grid grid-cols-1 gap-group lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Learning activity"
            description={`Views, completions, and submissions over the last ${range} days`}
          />
          <div className="p-card">
            {activity.loading ? (
              <Skeleton className="h-[160px] w-full" />
            ) : activity.data && activity.data.some((d) => d.value > 0) ? (
              <AreaChart data={activity.data} height={160} />
            ) : (
              <EmptyState title="No activity in this period" compact />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Score distribution" description="All assessment attempts" />
          <div className="p-card">
            {scores.loading ? (
              <Skeleton className="h-[120px] w-full" />
            ) : (
              <BarChart data={scores.data ?? []} height={120} />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Completion by team" description="Completed, in progress, and not started" />
        {teams.loading ? (
          <div className="space-y-group p-card">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-group p-card">
            {(teams.data ?? []).map((t) => (
              <div key={t.team} className="space-y-tight">
                <div className="flex items-baseline justify-between gap-snug">
                  <span className="text-base font-medium text-fg">{t.team}</span>
                  <span className="text-sm text-fg-secondary tnum">
                    {t.headcount} people · {t.rate}% complete
                  </span>
                </div>
                <StackedBar
                  height={8}
                  segments={[
                    { label: 'Completed', value: t.completed, color: 'var(--success)' },
                    { label: 'In progress', value: t.inProgress, color: 'var(--info)' },
                    { label: 'Not started', value: t.notStarted, color: 'var(--bg-inset)' },
                  ]}
                />
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-group border-t border-line pt-snug text-xs text-fg-tertiary">
              {[
                ['Completed', 'var(--success)'],
                ['In progress', 'var(--info)'],
                ['Not started', 'var(--bg-inset)'],
              ].map(([label, color]) => (
                <span key={label} className="inline-flex items-center gap-tight">
                  <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-group lg:grid-cols-2">
        <Card>
          <CardHeader title="Material engagement" description="Ranked by learners who opened them" />
          {popular.loading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {(popular.data ?? []).map((m, i) => (
                <li key={m.materialId} className="flex items-center gap-snug px-card py-row-y">
                  <span className="w-4 text-sm text-fg-tertiary tnum">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-base text-fg">{m.title}</span>
                  <span className="w-16 text-right text-sm text-fg-tertiary tnum">{m.views} opens</span>
                  <span className="hidden w-24 sm:block">
                    <ProgressBar value={m.completionRate} />
                  </span>
                  <span className="w-9 text-right text-sm text-fg-secondary tnum">{m.completionRate}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Learners needing coaching"
            description="Overdue work or below 40% completion"
            action={
              <Link to="/admin/users" className="touch-target relative text-sm text-fg-secondary hover:text-fg">
                All users
              </Link>
            }
          />
          {atRisk.loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : (atRisk.data ?? []).length === 0 ? (
            <div className="p-card">
              <EmptyState title="Everyone is on track" description="No overdue work and no one below 40%." compact />
            </div>
          ) : (
            <>
            <DataTable className="rounded-none border-0">
              <THead>
                <TR>
                  <TH>Learner</TH>
                  <TH>Completion</TH>
                  <TH>Overdue</TH>
                  <TH>Last active</TH>
                </TR>
              </THead>
              <TBody>
                {(atRisk.data ?? []).map((l) => (
                  <TR key={l.userId}>
                    <TD>
                      <span className="flex items-center gap-tight">
                        <Avatar name={l.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg">{l.name}</span>
                          <span className="block truncate text-sm text-fg-tertiary">{l.team}</span>
                        </span>
                      </span>
                    </TD>
                    <TD>
                      <span className={cn('tnum', l.completionRate < 25 ? 'text-danger-fg' : 'text-fg-secondary')}>
                        {l.completionRate}%
                      </span>
                    </TD>
                    <TD>{l.overdue > 0 ? <Badge tone="danger">{l.overdue}</Badge> : <span className="text-fg-tertiary"> - </span>}</TD>
                    <TD>
                      <span className="text-fg-secondary">{relativeTime(l.lastActiveAt)}</span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </DataTable>

            <CardList className="px-card pb-card">
              {(atRisk.data ?? []).map((l) => (
                <CardListItem key={l.userId}>
                  <div className="flex items-center gap-snug">
                    <Avatar name={l.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-fg">{l.name}</p>
                      <p className="truncate text-sm text-fg-tertiary">{l.team}</p>
                    </div>
                    {l.overdue > 0 && <Badge tone="danger">{l.overdue} overdue</Badge>}
                  </div>
                  <div className="mt-snug border-t border-line pt-tight">
                    <CardField label="Completion">{l.completionRate}%</CardField>
                    <CardField label="Last active">{relativeTime(l.lastActiveAt)}</CardField>
                  </div>
                </CardListItem>
              ))}
            </CardList>
            </>
          )}
        </Card>
      </div>

      <p className="text-sm text-fg-tertiary">
        Figures are computed from stored progress records and assessment
        attempts held in this browser. Connecting a backend replaces the source without changing this page.
      </p>
    </Page>
  )
}
