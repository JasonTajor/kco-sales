import { useMemo, useState } from 'react'
import {
  Check,
  Copy,
  Info,
  Loader2,
  Mail,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react'
import type { Role, User } from '@/types'
import type { Invitation, Permission, PermissionKey } from '@/types/rbac'
import { ACCESS_PRESETS, invitationState } from '@/types/rbac'
import { rbacService, userService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePermissions } from '@/features/auth/PermissionProvider'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { StatRow, StatTile } from '@/components/common/StatTile'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/tabs'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatDate, relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Users & access.
 *
 * Three things on one screen because they are one job: who is on the team, who
 * has been invited, and what each of them may do.
 *
 * The important design point is that nobody signs themselves up. An admin
 * records an invitation carrying a role and a permission set; the person then
 * sets their own password against it. The admin never learns the password,
 * which is better than the alternative - and it means account creation needs
 * no service-role key in the browser.
 */
type Tab = 'people' | 'invitations' | 'roles'

export function AccessPage() {
  const [tab, setTab] = useState<Tab>('people')
  const { can } = usePermissions()

  const people = useAsync(() => userService.all(), [])
  const invitations = useAsync(() => (can('users.view') ? rbacService.invitations() : Promise.resolve([])), [])
  const catalogue = useAsync(() => rbacService.permissions(), [])
  const defaults = useAsync(() => rbacService.roleDefaults(), [])

  const [inviteOpen, setInviteOpen] = useState(false)

  const pendingInvites = (invitations.data ?? []).filter((i) => invitationState(i) === 'pending')

  return (
    <Page>
      <PageHeader
        title="Users & access"
        description="Create accounts, and decide exactly what each person can do."
        crumbs={[{ label: 'Administration' }, { label: 'Users & access' }]}
        actions={
          can('users.invite') ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" aria-hidden />
              Create account
            </Button>
          ) : undefined
        }
      />

      <Callout variant="info" title="Sign-up is closed">
        Nobody can register themselves - not with a password, and not with Google. An account
        exists only because somebody here created it, and the role and permissions come from that
        record rather than from anything the person supplies. This is enforced in the database, so
        it holds even for a request that never touches this app.
      </Callout>

      <StatRow>
        <StatTile
          label="Team"
          value={(people.data ?? []).length}
          hint={`${(people.data ?? []).filter((u) => u.status === 'active').length} active`}
        />
        <StatTile
          label="Admins"
          value={(people.data ?? []).filter((u) => u.role === 'admin').length}
          hint="Can reach the console"
        />
        <StatTile
          label="Pending invites"
          value={pendingInvites.length}
          tone={pendingInvites.length > 0 ? 'warning' : 'neutral'}
          hint="Awaiting first sign-in"
        />
        <StatTile
          label="Permissions"
          value={(catalogue.data ?? []).length}
          hint="Individually grantable"
        />
      </StatRow>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        ariaLabel="Access view"
        options={[
          { value: 'people', label: 'People' },
          {
            value: 'invitations',
            label: `Invitations${pendingInvites.length ? ` (${pendingInvites.length})` : ''}`,
          },
          { value: 'roles', label: 'Role defaults' },
        ]}
      />

      {tab === 'people' && (
        <PeopleTab
          people={people.data ?? []}
          loading={people.loading}
          error={people.error}
          catalogue={catalogue.data ?? []}
          onChanged={() => {
            people.reload()
            invitations.reload()
          }}
        />
      )}

      {tab === 'invitations' && (
        <InvitationsTab
          invitations={invitations.data ?? []}
          loading={invitations.loading}
          error={invitations.error}
          onChanged={invitations.reload}
          onInvite={() => setInviteOpen(true)}
        />
      )}

      {tab === 'roles' && (
        <RoleDefaultsTab
          catalogue={catalogue.data ?? []}
          defaults={defaults.data}
          loading={defaults.loading || catalogue.loading}
        />
      )}

      {inviteOpen && (
        <InviteDialog
          catalogue={catalogue.data ?? []}
          onClose={() => setInviteOpen(false)}
          onCreated={() => {
            setInviteOpen(false)
            invitations.reload()
            setTab('invitations')
          }}
        />
      )}
    </Page>
  )
}

/* ---------------------------------------------------------------- people --- */

function PeopleTab({
  people,
  loading,
  error,
  catalogue,
  onChanged,
}: {
  people: User[]
  loading: boolean
  error: Error | null
  catalogue: Permission[]
  onChanged: () => void
}) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<User | null>(null)

  const rows = people.filter((u) => {
    const q = search.trim().toLowerCase()
    return q ? `${u.name} ${u.email} ${u.team}`.toLowerCase().includes(q) : true
  })

  if (loading) return <TableSkeleton rows={6} />
  if (error) return <ErrorState description={error.message} />

  return (
    <>
      <Toolbar>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-tight top-1/2 size-4 -translate-y-1/2 text-fg-tertiary"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="pl-8"
          />
        </div>
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="size-6" />}
          title="Nobody matches that search"
          description="Try a different name, email or team."
        />
      ) : (
        <ul className="space-y-tight">
          {rows.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => setEditing(u)}
                className="chunk chunk-press flex w-full items-center gap-group p-card text-left"
              >
                <Avatar name={u.name} src={u.avatarUrl} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-tight">
                    <span className="truncate font-bold text-fg">{u.name}</span>
                    <Badge tone={u.role === 'admin' ? 'info' : 'neutral'}>{u.role}</Badge>
                    <Badge
                      tone={
                        u.status === 'active'
                          ? 'success'
                          : u.status === 'pending'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {u.status}
                    </Badge>
                  </span>
                  <span className="mt-hair block truncate text-sm text-fg-secondary">
                    {u.email}
                  </span>
                  <span className="mt-hair block text-2xs text-fg-tertiary">
                    {u.team} · {u.jobTitle} · last active {relativeTime(u.lastActiveAt)}
                  </span>
                </span>
                <ShieldCheck className="size-4 flex-none text-fg-tertiary" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PersonDialog
          user={editing}
          catalogue={catalogue}
          onClose={() => setEditing(null)}
          onChanged={onChanged}
        />
      )}
    </>
  )
}

/**
 * One person's access.
 *
 * Role at the top, then every permission with a three-way control: inherit
 * from the role, explicitly granted, or explicitly denied. Three states rather
 * than a checkbox because "admin, but may not change roles" needs a way to say
 * no to something the role says yes to.
 */
function PersonDialog({
  user,
  catalogue,
  onClose,
  onChanged,
}: {
  user: User
  catalogue: Permission[]
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const { can, reload: reloadMine } = usePermissions()
  const { user: me } = useAuth()

  const access = useAsync(() => rbacService.forUser(user.id), [user.id])
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [role, setRole] = useState<Role>(user.role)

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>()
    catalogue.forEach((p) => {
      const list = map.get(p.category) ?? []
      list.push(p)
      map.set(p.category, list)
    })
    return [...map.entries()]
  }, [catalogue])

  const setPermission = async (key: PermissionKey, next: boolean | null) => {
    setBusyKey(key)
    try {
      await rbacService.setPermission(user.id, key, next)
      access.reload()
      // Changing your own access must update the sidebar immediately.
      if (me?.id === user.id) reloadMine()
      toast.success('Permission updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change that permission.')
    } finally {
      setBusyKey(null)
    }
  }

  const changeRole = async (next: Role) => {
    setRole(next)
    try {
      await userService.update(user.id, { role: next }, me?.id ?? '')
      toast.success(`${user.name} is now ${next}`)
      access.reload()
      onChanged()
      if (me?.id === user.id) reloadMine()
    } catch (err) {
      setRole(user.role)
      toast.error(err instanceof Error ? err.message : 'Could not change the role.')
    }
  }

  const changeStatus = async (next: User['status']) => {
    try {
      await userService.update(user.id, { status: next }, me?.id ?? '')
      toast.success(`Account ${next}`)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change the status.')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} size="lg" title={user.name} description={user.email}>
      <div className="space-y-rhythm">
        <div className="grid gap-group sm:grid-cols-2">
          <div className="space-y-tight">
            <p className="text-xs font-bold text-fg-secondary">Role</p>
            <Select
              ariaLabel="Role"
              value={role}
              disabled={!can('users.set_role')}
              onValueChange={(v) => void changeRole(v as Role)}
              options={[
                { value: 'sales', label: 'Sales - takes training' },
                { value: 'admin', label: 'Admin - can reach the console' },
              ]}
            />
            <p className="text-2xs text-fg-tertiary">
              The role decides whether the admin console is reachable at all. What they can do
              inside it is the permission list below.
            </p>
          </div>

          <div className="space-y-tight">
            <p className="text-xs font-bold text-fg-secondary">Account status</p>
            <Select
              ariaLabel="Status"
              value={user.status}
              disabled={!can('users.set_status')}
              onValueChange={(v) => void changeStatus(v as User['status'])}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Deactivated' },
                { value: 'pending', label: 'Pending' },
              ]}
            />
            <p className="text-2xs text-fg-tertiary">
              Deactivating revokes data access immediately - the database stops returning anything
              to them, without deleting their history.
            </p>
          </div>
        </div>

        {access.loading ? (
          <Loader2 className="size-4 animate-spin text-fg-tertiary" aria-label="Loading access" />
        ) : !can('users.permissions') ? (
          <Callout variant="info" title="View only">
            You can see this person's access but not change it. That needs the “Manage permissions”
            permission.
          </Callout>
        ) : (
          <div className="space-y-group">
            {grouped.map(([category, items]) => (
              <fieldset key={category} className="space-y-tight">
                <legend className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
                  {category}
                </legend>

                {items.map((permission) => {
                  const override = access.data?.overrides.get(permission.key)
                  const effective = access.data?.keys.has(permission.key) ?? false
                  const state: 'inherit' | 'grant' | 'deny' =
                    override === undefined ? 'inherit' : override ? 'grant' : 'deny'

                  return (
                    <div
                      key={permission.key}
                      className="flex flex-wrap items-start justify-between gap-tight rounded-lg border border-line px-tight py-tight"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-tight text-sm font-medium text-fg">
                          {permission.label}
                          {effective ? (
                            <Check className="size-3.5 text-success" aria-label="Allowed" />
                          ) : (
                            <X className="size-3.5 text-fg-tertiary" aria-label="Not allowed" />
                          )}
                        </p>
                        <p className="mt-hair text-2xs text-fg-tertiary">{permission.description}</p>
                      </div>

                      <div className="flex flex-none items-center gap-hair">
                        {busyKey === permission.key ? (
                          <Loader2 className="size-4 animate-spin text-fg-tertiary" aria-hidden />
                        ) : (
                          (
                            [
                              ['inherit', 'Role default', null],
                              ['grant', 'Allow', true],
                              ['deny', 'Deny', false],
                            ] as const
                          ).map(([id, label, value]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => void setPermission(permission.key, value)}
                              aria-pressed={state === id}
                              className={cn(
                                'rounded-md border-2 px-tight py-0.5 text-2xs font-bold transition-colors',
                                state === id
                                  ? id === 'deny'
                                    ? 'border-danger bg-danger-subtle text-danger-fg'
                                    : id === 'grant'
                                      ? 'border-success bg-success-subtle text-success-fg'
                                      : 'border-line-strong bg-surface-active text-fg'
                                  : 'border-line-chunk bg-surface text-fg-secondary hover:bg-surface-hover',
                              )}
                            >
                              {label}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </fieldset>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}

/* ----------------------------------------------------------- invitations --- */

function InvitationsTab({
  invitations,
  loading,
  error,
  onChanged,
  onInvite,
}: {
  invitations: Invitation[]
  loading: boolean
  error: Error | null
  onChanged: () => void
  onInvite: () => void
}) {
  const toast = useToast()
  const { can } = usePermissions()
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null)

  if (loading) return <TableSkeleton rows={4} />
  if (error) return <ErrorState description={error.message} />

  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={<Mail className="size-6" />}
        title="No invitations yet"
        description="Create an account for someone and they will appear here until they sign in for the first time."
        action={can('users.invite') ? <Button onClick={onInvite}>Create account</Button> : undefined}
      />
    )
  }

  const revoke = async () => {
    if (!revokeTarget) return
    try {
      await rbacService.revokeInvitation(revokeTarget.id)
      toast.success('Invitation revoked')
      setRevokeTarget(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revoke it.')
    }
  }

  return (
    <>
      <ul className="space-y-tight">
        {invitations.map((invitation) => {
          const state = invitationState(invitation)

          return (
            <li key={invitation.id} className="chunk p-card">
              <div className="flex flex-wrap items-start justify-between gap-group">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-tight">
                    <p className="truncate font-bold text-fg">
                      {invitation.fullName || invitation.email}
                    </p>
                    <Badge tone={invitation.role === 'admin' ? 'info' : 'neutral'}>
                      {invitation.role}
                    </Badge>
                    <Badge
                      tone={
                        state === 'accepted'
                          ? 'success'
                          : state === 'pending'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {state}
                    </Badge>
                  </div>

                  {invitation.fullName && (
                    <p className="mt-hair truncate text-sm text-fg-secondary">{invitation.email}</p>
                  )}

                  <p className="mt-hair text-2xs text-fg-tertiary">
                    {state === 'pending'
                      ? `Expires ${formatDate(invitation.expiresAt)}`
                      : state === 'accepted'
                        ? `Signed in ${relativeTime(invitation.acceptedAt!)}`
                        : `Created ${formatDate(invitation.createdAt)}`}
                    {invitation.department ? ` · ${invitation.department}` : ''}
                    {invitation.permissions.length > 0
                      ? ` · ${invitation.permissions.length} extra permission(s)`
                      : ''}
                  </p>

                  {invitation.note && (
                    <p className="mt-hair text-2xs italic text-fg-tertiary">{invitation.note}</p>
                  )}
                </div>

                {state === 'pending' && (
                  <div className="flex flex-none items-center gap-tight">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(invitation.email)
                        toast.success('Email copied')
                      }}
                    >
                      <Copy className="size-3.5" aria-hidden />
                      Copy email
                    </Button>
                    {can('users.invite') && (
                      <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(invitation)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <Callout variant="info" title="How the person gets in">
        Send them the sign-in page and tell them to use <strong>Set up my account</strong> with the
        exact address above. They choose their own password, so nobody else ever knows it. The
        invitation expires after 14 days.
      </Callout>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
        title={`Revoke the invitation for ${revokeTarget?.email ?? ''}?`}
        description="They will no longer be able to create an account with that address. You can invite them again afterwards."
        confirmLabel="Revoke"
        destructive
        onConfirm={revoke}
      />
    </>
  )
}

/* ---------------------------------------------------------------- invite --- */

function InviteDialog({
  catalogue,
  onClose,
  onCreated,
}: {
  catalogue: Permission[]
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [note, setNote] = useState('')
  const [presetId, setPresetId] = useState(ACCESS_PRESETS[0]!.id)
  const [custom, setCustom] = useState<Set<PermissionKey>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)

  const preset = ACCESS_PRESETS.find((p) => p.id === presetId)!

  // Switching preset replaces the selection; the checkboxes are for tuning it
  // afterwards, not for accumulating across presets.
  const choosePreset = (id: string) => {
    setPresetId(id)
    const next = ACCESS_PRESETS.find((p) => p.id === id)
    setCustom(new Set(next?.permissions ?? []))
  }

  const toggle = (key: PermissionKey) => {
    const next = new Set(custom)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCustom(next)
  }

  const submit = async () => {
    if (!email.trim()) {
      toast.error('An email address is required.')
      return
    }
    setBusy(true)
    try {
      await rbacService.invite({
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        role: preset.role,
        department: department.trim() || undefined,
        position: position.trim() || undefined,
        permissions: [...custom],
        note: note.trim() || undefined,
      })
      toast.success(`Account created for ${email.trim()}`)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>()
    catalogue.forEach((p) => {
      const list = map.get(p.category) ?? []
      list.push(p)
      map.set(p.category, list)
    })
    return [...map.entries()]
  }, [catalogue])

  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      size="lg"
      title="Create an account"
      description="They will set their own password the first time they sign in."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !email.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Create account'}
          </Button>
        </>
      }
    >
      <div className="space-y-group">
        <div className="grid gap-tight sm:grid-cols-2">
          <div className="space-y-tight">
            <label htmlFor="inv-email" className="block text-xs font-bold text-fg-secondary">
              Work email
            </label>
            <Input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@kco.ph"
              autoFocus
            />
          </div>
          <div className="space-y-tight">
            <label htmlFor="inv-name" className="block text-xs font-bold text-fg-secondary">
              Full name
            </label>
            <Input
              id="inv-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Andrea Lopez"
            />
          </div>
          <div className="space-y-tight">
            <label htmlFor="inv-dept" className="block text-xs font-bold text-fg-secondary">
              Team
            </label>
            <Input
              id="inv-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Chat Support"
            />
          </div>
          <div className="space-y-tight">
            <label htmlFor="inv-position" className="block text-xs font-bold text-fg-secondary">
              Job title
            </label>
            <Input
              id="inv-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Chat Support Agent"
            />
          </div>
        </div>

        <fieldset className="space-y-tight">
          <legend className="text-xs font-bold text-fg-secondary">Access</legend>
          <div className="space-y-tight">
            {ACCESS_PRESETS.map((p) => (
              <label
                key={p.id}
                className={cn(
                  'flex cursor-pointer items-start gap-tight rounded-lg border-2 px-tight py-tight transition-colors',
                  presetId === p.id
                    ? 'border-primary bg-primary-subtle'
                    : 'border-line-chunk hover:bg-surface-hover',
                )}
              >
                <input
                  type="radio"
                  name="preset"
                  checked={presetId === p.id}
                  onChange={() => choosePreset(p.id)}
                  className="mt-0.5 size-4 flex-none accent-[var(--primary)]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-tight text-sm font-bold text-fg">
                    {p.label}
                    <Badge tone={p.role === 'admin' ? 'info' : 'neutral'}>{p.role}</Badge>
                  </span>
                  <span className="mt-hair block text-2xs text-fg-secondary">{p.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-hair text-xs font-bold text-fg-secondary hover:text-fg"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {showAll ? 'Hide' : 'Fine-tune'} individual permissions
            {custom.size > 0 && !showAll ? ` (${custom.size} selected)` : ''}
          </button>

          {showAll && (
            <div className="mt-tight space-y-group">
              {preset.role === 'admin' && (
                <p className="flex items-start gap-hair text-2xs text-fg-tertiary">
                  <Info className="mt-px size-3.5 flex-none" aria-hidden />
                  An admin already holds every permission by default. Ticking boxes here only adds
                  explicit grants; to take something away, open the person afterwards and set it to
                  Deny.
                </p>
              )}

              {grouped.map(([category, items]) => (
                <fieldset key={category} className="space-y-hair">
                  <legend className="text-2xs font-bold uppercase tracking-wider text-fg-tertiary">
                    {category}
                  </legend>
                  {items.map((permission) => (
                    <label
                      key={permission.key}
                      className="flex items-start gap-tight py-0.5 text-sm text-fg"
                    >
                      <input
                        type="checkbox"
                        checked={custom.has(permission.key)}
                        onChange={() => toggle(permission.key)}
                        className="mt-0.5 size-4 flex-none accent-[var(--primary)]"
                      />
                      <span className="min-w-0">
                        {permission.label}
                        <span className="block text-2xs text-fg-tertiary">
                          {permission.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-tight">
          <label htmlFor="inv-note" className="block text-xs font-bold text-fg-secondary">
            Note
          </label>
          <Textarea
            id="inv-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Starts Monday, joining the Messenger queue."
          />
        </div>
      </div>
    </Dialog>
  )
}

/* ---------------------------------------------------------- role defaults -- */

function RoleDefaultsTab({
  catalogue,
  defaults,
  loading,
}: {
  catalogue: Permission[]
  defaults?: Record<Role, PermissionKey[]>
  loading: boolean
}) {
  if (loading || !defaults) return <TableSkeleton rows={8} />

  const admin = new Set(defaults.admin)
  const sales = new Set(defaults.sales)

  const grouped = new Map<string, Permission[]>()
  catalogue.forEach((p) => {
    const list = grouped.get(p.category) ?? []
    list.push(p)
    grouped.set(p.category, list)
  })

  return (
    <Card>
      <CardHeader
        title="What each role grants by default"
        description="A person inherits these, then any individual grant or denial applied to them overrides it."
      />

      <div className="space-y-group p-card pt-0">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <p className="mb-tight text-2xs font-bold uppercase tracking-wider text-fg-tertiary">
              {category}
            </p>
            <ul className="space-y-hair">
              {items.map((p) => (
                <li
                  key={p.key}
                  className="flex items-center gap-group border-b border-line py-tight last:border-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-fg">{p.label}</span>
                    <span className="block text-2xs text-fg-tertiary">{p.description}</span>
                  </span>
                  <RoleDot label="Admin" on={admin.has(p.key)} />
                  <RoleDot label="Sales" on={sales.has(p.key)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

function RoleDot({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="flex w-14 flex-none flex-col items-center gap-0.5">
      <span
        aria-hidden
        className={cn(
          'flex size-5 items-center justify-center rounded-full',
          on ? 'bg-success text-white' : 'bg-bg-inset text-fg-tertiary',
        )}
      >
        {on ? <Check className="size-3" /> : <X className="size-3" />}
      </span>
      <span className="text-[10px] font-medium text-fg-tertiary">{label}</span>
      <span className="sr-only">{on ? 'granted' : 'not granted'}</span>
    </span>
  )
}
