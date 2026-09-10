import { useMemo, useState } from 'react'
import {
  Check,
  Copy,
  Info,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react'
import type { Role, User } from '@/types'
import type { Invitation, Permission, PermissionKey } from '@/types/rbac'
import { ACCESS_PRESETS, invitationState } from '@/types/rbac'
import { displayIdentifier, normaliseUsername, usernameProblem } from '@/lib/username'
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

      <Callout variant="info" title="You create the accounts">
        Nobody can register themselves - not with a password, and not with Google. You set the
        username, the password and the access; they sign in straight away with no email involved.
        This is enforced in the database, so it holds even for a request that never touches this
        app.
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
          label="Never signed in"
          value={pendingInvites.length}
          tone={pendingInvites.length > 0 ? 'warning' : 'neutral'}
          hint="Created but not yet used"
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
            label: `Account log${pendingInvites.length ? ` (${pendingInvites.length})` : ''}`,
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
                  {/* The username is what they sign in with; the internal
                      address is noise. Real email accounts show the address. */}
                  <span className="mt-hair block truncate text-sm text-fg-secondary">
                    {displayIdentifier(u)}
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
        icon={<UserPlus className="size-6" />}
        title="No accounts created yet"
        description="Every account you create is listed here, with the access it was given."
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
                      {invitation.fullName || invitation.username || invitation.email}
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

                  {/* Show the username, not the internal address - the
                      kco.local domain is an implementation detail and putting
                      it in front of an admin invites them to email it. */}
                  <p className="mt-hair truncate text-sm text-fg-secondary">
                    {invitation.username ?? invitation.email}
                  </p>

                  <p className="mt-hair text-2xs text-fg-tertiary">
                    {state === 'accepted'
                      ? `Active since ${relativeTime(invitation.acceptedAt!)}`
                      : state === 'pending'
                        ? 'Created, never signed in'
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
                        void navigator.clipboard?.writeText(
                          invitation.username ?? invitation.email,
                        )
                        toast.success('Username copied')
                      }}
                    >
                      <Copy className="size-3.5" aria-hidden />
                      Copy username
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
        They go to the sign-in page and enter the username above with the password you gave them.
        Nothing is emailed. If a password is lost, create a new one from their profile - it cannot
        be read back.
      </Callout>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
        title={`Withdraw the pending account for ${revokeTarget?.username ?? revokeTarget?.email ?? ''}?`}
        description="Only possible while it has never been signed into. The username becomes free to use again."
        confirmLabel="Withdraw"
        destructive
        onConfirm={revoke}
      />
    </>
  )
}

/* ---------------------------------------------------------------- invite --- */

/**
 * Creating an account.
 *
 * The admin sets the username and the password, and the account works
 * immediately - there is no email to send and nothing for the new person to
 * accept. That is why the form asks for a password: somebody has to choose
 * one, and an admin handing it over in person is simpler than a mail round
 * trip for a team that shares an office.
 *
 * A generated suggestion is offered because an admin inventing twenty
 * passwords will reuse one.
 */
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

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState(() => suggestPassword())
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [note, setNote] = useState('')
  const [presetId, setPresetId] = useState(ACCESS_PRESETS[0]!.id)
  const [custom, setCustom] = useState<Set<PermissionKey>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null)

  const preset = ACCESS_PRESETS.find((p) => p.id === presetId)!

  const nameProblem = username ? usernameProblem(username) : null
  const passwordProblem =
    password.length > 0 && password.length < 8 ? 'Use at least 8 characters.' : null
  const ready = Boolean(username) && !nameProblem && password.length >= 8 && !busy

  // Switching preset replaces the selection; the checkboxes tune it after.
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
    setBusy(true)
    try {
      const result = await rbacService.createAccount({
        username: normaliseUsername(username),
        password,
        fullName: fullName.trim() || undefined,
        role: preset.role,
        department: department.trim() || undefined,
        position: position.trim() || undefined,
        permissions: [...custom],
        note: note.trim() || undefined,
      })
      // Held on screen rather than toasted away: this is the only time the
      // password is visible, and the admin has to pass it on.
      setCreated({ username: result.username, password })
      toast.success(`Account created for ${result.username}`)
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

  /* ---------------------------------------------------------- credentials -- */

  if (created) {
    return (
      <Dialog
        open
        onOpenChange={() => {
          onCreated()
        }}
        title="Account ready"
        description="Give these to them. The password is not shown again."
        footer={
          <Button
            onClick={() => {
              onCreated()
            }}
          >
            Done
          </Button>
        }
      >
        <div className="space-y-group">
          <div className="chunk space-y-tight p-card">
            <CredentialRow label="Username" value={created.username} />
            <CredentialRow label="Password" value={created.password} />
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `Username: ${created.username}\nPassword: ${created.password}`,
              )
              toast.success('Credentials copied')
            }}
          >
            <Copy className="size-4" aria-hidden />
            Copy both
          </Button>

          <Callout variant="warning" title="Shown once">
            The password is not stored anywhere readable - not by this app and not by you. If it
            is lost, come back and set a new one from the person&apos;s profile.
          </Callout>

          <p className="text-xs text-fg-secondary">
            They sign in at the normal sign-in page with that username. Ask them to change the
            password from Settings afterwards.
          </p>
        </div>
      </Dialog>
    )
  }

  /* ---------------------------------------------------------------- form -- */

  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      size="lg"
      title="Create an account"
      description="They can sign in with these straight away. No email is sent."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!ready}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Create account'}
          </Button>
        </>
      }
    >
      <div className="space-y-group">
        <div className="grid gap-tight sm:grid-cols-2">
          <div className="space-y-tight">
            <label htmlFor="acc-username" className="block text-xs font-bold text-fg-secondary">
              Username
            </label>
            <Input
              id="acc-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="andrea.lopez"
              autoCapitalize="none"
              spellCheck={false}
              invalid={Boolean(nameProblem)}
              autoFocus
            />
            {nameProblem ? (
              <p className="text-2xs text-danger-fg">{nameProblem}</p>
            ) : (
              <p className="text-2xs text-fg-tertiary">
                What they type to sign in. Lower-case, 3-30 characters.
              </p>
            )}
          </div>

          <div className="space-y-tight">
            <label htmlFor="acc-password" className="block text-xs font-bold text-fg-secondary">
              Password
            </label>
            <div className="flex items-center gap-tight">
              <Input
                id="acc-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                spellCheck={false}
                invalid={Boolean(passwordProblem)}
                className="font-mono"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPassword(suggestPassword())}
                title="Suggest another"
                aria-label="Suggest another password"
              >
                <RotateCcw className="size-3.5" aria-hidden />
              </Button>
            </div>
            {passwordProblem ? (
              <p className="text-2xs text-danger-fg">{passwordProblem}</p>
            ) : (
              <p className="text-2xs text-fg-tertiary">
                Shown once after creating. They can change it in Settings.
              </p>
            )}
          </div>

          <div className="space-y-tight">
            <label htmlFor="acc-name" className="block text-xs font-bold text-fg-secondary">
              Full name
            </label>
            <Input
              id="acc-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Andrea Lopez"
            />
          </div>

          <div className="space-y-tight">
            <label htmlFor="acc-dept" className="block text-xs font-bold text-fg-secondary">
              Team
            </label>
            <Input
              id="acc-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Chat Support"
            />
          </div>

          <div className="space-y-tight sm:col-span-2">
            <label htmlFor="acc-position" className="block text-xs font-bold text-fg-secondary">
              Job title
            </label>
            <Input
              id="acc-position"
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
            <ShieldCheck className="size-3.5" aria-hidden />
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
          <label htmlFor="acc-note" className="block text-xs font-bold text-fg-secondary">
            Note
          </label>
          <Textarea
            id="acc-note"
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

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-group">
      <span className="text-xs font-bold text-fg-secondary">{label}</span>
      <code className="min-w-0 truncate font-mono text-base font-bold text-fg">{value}</code>
    </div>
  )
}

/**
 * A password an admin can read aloud.
 *
 * Two words, digits and a symbol. Deliberately not maximally random: this gets
 * dictated across a desk or typed into a chat, so ambiguous characters and
 * unpronounceable strings cost more than the entropy is worth. An admin who
 * finds it awkward can type their own.
 */
function suggestPassword(): string {
  const words = [
    'Kangkong', 'Malunggay', 'Talong', 'Sitaw', 'Ampalaya', 'Kamote',
    'Batangas', 'Laguna', 'Cavite', 'Bulacan', 'Quezon', 'Rizal',
  ]
  const pick = () => words[Math.floor(Math.random() * words.length)]!
  const digits = Array.from({ length: 3 }, () => '23456789'[Math.floor(Math.random() * 8)]).join('')
  const symbol = '!@#$%&*'[Math.floor(Math.random() * 7)]
  return `${pick()}-${pick()}-${digits}${symbol}`
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
