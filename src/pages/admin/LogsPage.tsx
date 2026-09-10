import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { ActivityAction } from '@/types'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { reportService, userService } from '@/services'

import { formatDateTime, relativeTime } from '@/lib/format'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardField, CardList, CardListItem, DataTable, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'

const actionLabels: Record<ActivityAction, string> = {
  'material.viewed': 'Viewed material',
  'material.completed': 'Completed material',
  'material.published': 'Published material',
  'material.archived': 'Archived material',
  'material.created': 'Created material',
  'material.updated': 'Updated material',
  'assessment.created': 'Assessment created',
  'assessment.updated': 'Assessment updated',
  'assessment.published': 'Assessment published',
  'assessment.archived': 'Assessment archived',
  'assessment.submitted': 'Submitted assessment',
  'assignment.created': 'Created assignment',
  'user.invited': 'Invited user',
  'user.deactivated': 'Deactivated user',
  'user.login': 'Signed in',
  'activity.ran': 'Ran training activity',
  'activity.created': 'Created activity',
  'activity.updated': 'Updated activity',
  'activity.archived': 'Archived activity',
  'user.invite_revoked': 'Revoked invitation',
  'user.role_changed': 'Changed role',
  'user.status_changed': 'Changed account status',
  'user.permission_changed': 'Changed permissions',
  'script.created': 'Created script',
  'script.updated': 'Updated script',
  'objection.created': 'Created objection',
  'objection.updated': 'Updated objection',
  'announcement.created': 'Posted announcement',
  'announcement.updated': 'Updated announcement',
  'sales_bible.updated': 'Updated Sales Bible',
  'settings.updated': 'Updated settings',
}

/** Content and account changes are the entries an auditor actually cares about. */
const actionTone: Partial<Record<ActivityAction, BadgeTone>> = {
  'material.published': 'success',
  'material.archived': 'warning',
  'material.created': 'info',
  'material.updated': 'info',
  'user.invited': 'info',
  'user.deactivated': 'danger',
  'settings.updated': 'warning',
  'assignment.created': 'info',
}

export function LogsPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string>('all')
  const [actorId, setActorId] = useState<string>('all')
  const [limit, setLimit] = useState(50)

  const debounced = useDebounce(search, 220)
  const logs = useAsync(
    () => reportService.activityLog({ search: debounced, action, actorId, limit }),
    [debounced, action, actorId, limit],
  )

  // The people who appear in the log. Fetched, because an audit trail that
  // cannot name its actors is not much of an audit trail - and the demo store
  // would have named the wrong ones entirely.
  const users = useAsync(() => userService.all(), [])
  const people = users.data ?? []
  const entries = logs.data ?? []

  const actors = useMemo(
    () =>
      [...new Set(entries.map((e) => e.actorId))]
        .map((id) => people.find((u) => u.id === id))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [entries, people],
  )

  const rows = entries
  const filtersActive = Boolean(debounced) || action !== 'all' || actorId !== 'all'

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Administration' }, { label: 'Activity Logs' }]}
        title="Activity Logs"
        description="An audit trail of content changes, account changes, and learner activity."
      />

      <Toolbar>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search person or target…"
          aria-label="Search activity logs"
          leading={<Search />}
          className="w-full sm:w-72"
        />
        <Select
          size="sm"
          ariaLabel="Filter by action"
          value={action}
          onValueChange={setAction}
          options={[
            { value: 'all', label: 'All actions' },
            ...Object.entries(actionLabels).map(([value, label]) => ({ value, label })),
          ]}
          className="w-[190px] max-w-full"
        />
        <Select
          size="sm"
          ariaLabel="Filter by person"
          value={actorId}
          onValueChange={setActorId}
          options={[{ value: 'all', label: 'Everyone' }, ...actors.map((u) => ({ value: u.id, label: u.name }))]}
          className="w-[170px] max-w-full"
        />
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setAction('all')
              setActorId('all')
            }}
          >
            Clear
          </Button>
        )}
        <span className="ml-auto text-sm text-fg-tertiary tnum">{rows.length} entries</span>
      </Toolbar>

      {logs.loading ? (
        <TableSkeleton rows={10} cols={4} />
      ) : logs.error ? (
        <ErrorState onRetry={logs.reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No log entries match"
          description="Try a different search or clear the filters."
          action={
            filtersActive ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setAction('all')
                  setActorId('all')
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable>
            <THead>
              <TR>
                <TH width="200px">Person</TH>
                <TH width="180px">Action</TH>
                <TH>Target</TH>
                <TH width="150px">When</TH>
                <TH width="130px">IP address</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((e) => {
                const actor = people.find((u) => u.id === e.actorId)
                return (
                  <TR key={e.id}>
                    <TD>
                      <span className="flex items-center gap-tight">
                        <Avatar name={actor?.name ?? 'Unknown'} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg">{actor?.name ?? 'Unknown user'}</span>
                          <span className="block truncate text-sm text-fg-tertiary">
                            {actor?.role === 'admin' ? 'Administrator' : 'Sales'}
                          </span>
                        </span>
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={actionTone[e.action] ?? 'neutral'}>{actionLabels[e.action]}</Badge>
                    </TD>
                    <TD>
                      <span className="block max-w-[320px] truncate text-fg-secondary">{e.targetLabel}</span>
                    </TD>
                    <TD>
                      <span className="block text-fg-secondary">{relativeTime(e.at)}</span>
                      <span className="block text-sm text-fg-tertiary">{formatDateTime(e.at)}</span>
                    </TD>
                    <TD>
                      <span className="font-mono text-sm text-fg-tertiary">{e.ip ?? ' - '}</span>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </DataTable>

          <CardList>
            {rows.map((e) => {
              const actor = people.find((u) => u.id === e.actorId)
              return (
                <CardListItem key={e.id}>
                  <div className="flex items-center gap-snug">
                    <Avatar name={actor?.name ?? 'Unknown'} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-fg">{actor?.name ?? 'Unknown user'}</p>
                      <p className="text-sm text-fg-tertiary">{relativeTime(e.at)}</p>
                    </div>
                  </div>
                  <div className="mt-snug border-t border-line pt-tight">
                    <CardField label="Action">
                      <Badge tone={actionTone[e.action] ?? 'neutral'}>{actionLabels[e.action]}</Badge>
                    </CardField>
                    <CardField label="Target">{e.targetLabel}</CardField>
                  </div>
                </CardListItem>
              )
            })}
          </CardList>

          {rows.length >= limit && (
            <div className="flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + 50)}>
                Load 50 more
              </Button>
            </div>
          )}
        </>
      )}
    </Page>
  )
}
