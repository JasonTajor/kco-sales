/*
 * SUPERSEDED by src/pages/admin/AccessPage.tsx.
 *
 * No route points here any more. AccessPage covers the same roster plus
 * invitations and the permission matrix, and this page's "invite" action
 * called a service method that now throws by design - creating an auth user
 * needs the service role key, which never belongs in the browser.
 *
 * Kept for reference rather than deleted; delete it once you are happy with
 * AccessPage.
 */

import { useState } from 'react'
import { MoreHorizontal, Search, UserPlus, X } from 'lucide-react'
import type { Paginated, Role, Team, User, UserStatus } from '@/types'
import { TEAMS } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { userService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate, relativeTime } from '@/lib/format'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Field, Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { CardField, CardList, CardListItem, DataTable, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { UserStatusBadge } from '@/components/ui/status'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

type SortKey = 'name' | 'team' | 'joinedAt' | 'lastActiveAt'

export function UsersPage() {
  const { user } = useAuth()
  const actorId = user!.id
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | 'all'>('all')
  const [status, setStatus] = useState<UserStatus | 'all'>('all')
  const [team, setTeam] = useState<Team | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [inviteOpen, setInviteOpen] = useState(false)

  const debounced = useDebounce(search, 200)

  const { data, loading, error, reload } = useAsync<Paginated<User>>(
    () => userService.list({ search: debounced, role, status, team, page, pageSize, sortBy, sortDir }),
    [debounced, role, status, team, page, pageSize, sortBy, sortDir],
  )

  const sort = (key: SortKey) => {
    if (key === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const dirFor = (key: SortKey) => (sortBy === key ? sortDir : null)

  const patchUser = async (target: User, patch: Partial<User>, message: string) => {
    await userService.update(target.id, patch, actorId)
    toast.success(message, target.name)
    reload()
  }

  const filtersActive = search !== '' || role !== 'all' || status !== 'all' || team !== 'all'
  const rows = data?.rows ?? []

  return (
    <Page>
      <PageHeader
        title="Users"
        description="Everyone with access to the platform, and what they can reach."
        crumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        actions={
          <Button variant="primary" size="sm" icon={<UserPlus className="size-3.5" />} onClick={() => setInviteOpen(true)}>
            Invite user
          </Button>
        }
      />

      <Toolbar>
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search name, email, or title…"
          aria-label="Search users"
          leading={<Search className="size-3.5" />}
          className="w-[280px] max-w-full"
        />
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v as Role | 'all')
            setPage(1)
          }}
          ariaLabel="Filter by role"
          size="sm"
          options={[
            { value: 'all', label: 'All roles' },
            { value: 'admin', label: 'Administrators' },
            { value: 'sales', label: 'Sales agents' },
          ]}
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as UserStatus | 'all')
            setPage(1)
          }}
          ariaLabel="Filter by status"
          size="sm"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <Select
          value={team}
          onValueChange={(v) => {
            setTeam(v as Team | 'all')
            setPage(1)
          }}
          ariaLabel="Filter by team"
          size="sm"
          options={[{ value: 'all', label: 'All teams' }, ...TEAMS.map((t) => ({ value: t, label: t }))]}
        />
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            icon={<X className="size-3.5" />}
            onClick={() => {
              setSearch('')
              setRole('all')
              setStatus('all')
              setTeam('all')
              setPage(1)
            }}
          >
            Clear
          </Button>
        )}
      </Toolbar>

      {error && <ErrorState onRetry={reload} />}
      {loading && !data && <TableSkeleton rows={8} cols={6} />}

      {data && rows.length === 0 && (
        <EmptyState title="No users match those filters" description="Try a broader search." />
      )}

      {rows.length > 0 && (
        <Card className="overflow-hidden p-0">
          <DataTable>
            <THead>
              <TR>
                <TH sortable sortDir={dirFor('name')} onSort={() => sort('name')}>
                  Name
                </TH>
                <TH width="120px">Role</TH>
                <TH width="130px">Status</TH>
                <TH width="150px" sortable sortDir={dirFor('team')} onSort={() => sort('team')}>
                  Team
                </TH>
                <TH width="130px" sortable sortDir={dirFor('joinedAt')} onSort={() => sort('joinedAt')}>
                  Joined
                </TH>
                <TH width="130px" sortable sortDir={dirFor('lastActiveAt')} onSort={() => sort('lastActiveAt')}>
                  Last active
                </TH>
                <TH width="48px">
                  <span className="sr-only">Actions</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <div className="flex items-center gap-snug">
                      <Avatar name={u.name} src={u.avatarUrl} size="md" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{u.name}</p>
                        <p className="truncate text-2xs text-fg-tertiary">{u.email}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={u.role === 'admin' ? 'primary' : 'neutral'}>
                      {u.role === 'admin' ? 'Admin' : 'Sales'}
                    </Badge>
                  </TD>
                  <TD>
                    <UserStatusBadge status={u.status} bare />
                  </TD>
                  <TD>
                    <span className="text-sm text-fg-secondary">{u.team}</span>
                  </TD>
                  <TD>
                    <span className="text-2xs text-fg-tertiary">{formatDate(u.joinedAt)}</span>
                  </TD>
                  <TD>
                    <span className="text-2xs text-fg-tertiary">{relativeTime(u.lastActiveAt)}</span>
                  </TD>
                  <TD>
                    <DropdownMenu>
                      <DropdownTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownContent>
                        <DropdownItem
                          disabled={u.id === actorId}
                          onSelect={() =>
                            void patchUser(
                              u,
                              { role: u.role === 'admin' ? 'sales' : 'admin' },
                              u.role === 'admin' ? 'Changed to sales agent' : 'Promoted to administrator',
                            )
                          }
                        >
                          {u.role === 'admin' ? 'Make sales agent' : 'Make administrator'}
                        </DropdownItem>
                        {u.status === 'pending' && (
                          <DropdownItem onSelect={() => void patchUser(u, { status: 'active' }, 'Invitation accepted')}>
                            Mark as active
                          </DropdownItem>
                        )}
                        <DropdownSeparator />
                        {u.status === 'inactive' ? (
                          <DropdownItem onSelect={() => void patchUser(u, { status: 'active' }, 'User reactivated')}>
                            Reactivate
                          </DropdownItem>
                        ) : (
                          <DropdownItem
                            destructive
                            disabled={u.id === actorId}
                            onSelect={() => void patchUser(u, { status: 'inactive' }, 'User deactivated')}
                          >
                            Deactivate
                          </DropdownItem>
                        )}
                      </DropdownContent>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>

          <CardList>
            {rows.map((u) => (
              <CardListItem key={u.id}>
                <div className="flex items-center gap-snug">
                  <Avatar name={u.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-fg">{u.name}</p>
                    <p className="truncate text-sm text-fg-tertiary">{u.email}</p>
                  </div>
                  <UserStatusBadge status={u.status} />
                </div>
                <div className="mt-snug border-t border-line pt-tight">
                  <CardField label="Role">
                    <Badge tone={u.role === 'admin' ? 'primary' : 'neutral'}>
                      {u.role === 'admin' ? 'Admin' : 'Sales'}
                    </Badge>
                  </CardField>
                  <CardField label="Team">{u.team}</CardField>
                  <CardField label="Last activity">{relativeTime(u.lastActiveAt)}</CardField>
                </div>
              </CardListItem>
            ))}
          </CardList>

          <div className="border-t border-line px-tight">
            <Pagination
              page={data!.page}
              pageSize={data!.pageSize}
              total={data!.total}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s)
                setPage(1)
              }}
            />
          </div>
        </Card>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        actorId={actorId}
        onInvited={() => {
          setInviteOpen(false)
          reload()
        }}
      />
    </Page>
  )
}

function InviteDialog({
  open,
  onOpenChange,
  actorId,
  onInvited,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  actorId: string
  onInvited: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [role, setRole] = useState<Role>('sales')
  const [team, setTeam] = useState<Team>('Phone Sales')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const emailValid = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)
  const nameError = touched && !name.trim() ? 'Enter a full name' : undefined
  const emailError = touched && !emailValid ? 'Enter a valid email address' : undefined

  const reset = () => {
    setName('')
    setEmail('')
    setJobTitle('')
    setRole('sales')
    setTeam('Phone Sales')
    setTouched(false)
  }

  const submit = async () => {
    setTouched(true)
    if (!name.trim() || !emailValid) return
    setSaving(true)
    const created = await userService.invite(
      { name: name.trim(), email: email.trim(), role, team, jobTitle: jobTitle.trim() || 'Sales Agent' },
      actorId,
    )
    setSaving(false)
    toast.success('Invitation sent', `${created.name} is pending acceptance.`)
    reset()
    onInvited()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
      title="Invite a user"
      description="They join as pending until they accept."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void submit()}>
            Send invitation
          </Button>
        </>
      }
    >
      <div className="space-y-group py-tight">
        <Field label="Full name" required error={nameError} htmlFor="invite-name">
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={Boolean(nameError)}
            placeholder="Maria Santos"
          />
        </Field>
        <Field label="Email" required error={emailError} htmlFor="invite-email">
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(emailError)}
            placeholder="maria@kco.ph"
          />
        </Field>
        <Field label="Job title" hint="Defaults to Sales Agent." htmlFor="invite-title">
          <Input
            id="invite-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Chat Support Specialist"
          />
        </Field>
        <div className="grid grid-cols-1 gap-group sm:grid-cols-2">
          <Field label="Role" htmlFor="invite-role">
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Role)}
              ariaLabel="Role"
              options={[
                { value: 'sales', label: 'Sales agent' },
                { value: 'admin', label: 'Administrator', hint: 'Full access to users and content' },
              ]}
            />
          </Field>
          <Field label="Team" htmlFor="invite-team">
            <Select
              value={team}
              onValueChange={(v) => setTeam(v as Team)}
              ariaLabel="Team"
              options={TEAMS.map((t) => ({ value: t, label: t }))}
            />
          </Field>
        </div>
      </div>
    </Dialog>
  )
}
