import type {
  EffectivePermissions,
  Invitation,
  Permission,
  PermissionKey,
} from '@/types/rbac'
import type { Role } from '@/types'
import { createIsolatedClient, requireDb, unwrap } from '@/lib/supabase'
import { normaliseUsername } from '@/lib/username'
import type { rbacService as DemoApi } from '../demo/rbacService'

/**
 * Permissions and invitations, backed by Supabase (§8 extended).
 *
 * Everything that changes access goes through a guarded RPC rather than a
 * table write: `admin_invite_user`, `admin_revoke_invitation` and
 * `admin_set_permission` each check the caller's own permission, audit the
 * change, and - in the case of `admin_set_permission` - refuse a change that
 * would leave nobody able to manage permissions at all.
 *
 * That last guard is the reason this is not a plain upsert. An admin removing
 * their own `users.permissions` would otherwise lock the entire team out of
 * the authorization system, recoverable only by hand in SQL.
 */
export const rbacService: typeof DemoApi = {
  /** The catalogue. Readable by anyone signed in; the UI needs the labels. */
  async permissions(): Promise<Permission[]> {
    const db = requireDb()
    const rows = unwrap(await db.from('permissions').select('*').order('sort_order'))
    return rows.map((r) => ({
      key: r.key as PermissionKey,
      label: r.label,
      description: r.description,
      category: r.category,
      sortOrder: r.sort_order,
    }))
  },

  /** What each role grants by default. */
  async roleDefaults(): Promise<Record<Role, PermissionKey[]>> {
    const db = requireDb()
    const rows = unwrap(await db.from('role_permissions').select('*'))

    const out: Record<Role, PermissionKey[]> = { admin: [], sales: [] }
    rows.forEach((r) => out[r.role].push(r.permission_key as PermissionKey))
    return out
  },

  /**
   * The caller's own effective permissions.
   *
   * Read from `my_permissions()` rather than computed on the client, so the UI
   * and the RLS policies are answering the same question with the same code.
   * A guard that disagreed with the database would either hide something the
   * user may do, or offer something that then fails.
   */
  async mine(): Promise<Set<PermissionKey>> {
    const db = requireDb()
    const res = await db.rpc('my_permissions')
    if (res.error) throw new Error(res.error.message)
    return new Set((res.data ?? []) as PermissionKey[])
  },

  /** One person's effective access, plus which entries were customised. */
  async forUser(userId: string): Promise<EffectivePermissions> {
    const db = requireDb()

    const [profileRes, overridesRes, defaultsRes] = await Promise.all([
      db.from('profiles').select('role').eq('id', userId).single(),
      db.from('user_permissions').select('permission_key, granted').eq('user_id', userId),
      db.from('role_permissions').select('role, permission_key'),
    ])
    if (profileRes.error) throw new Error(profileRes.error.message)

    const role = profileRes.data.role
    const overrides = new Map<PermissionKey, boolean>(
      unwrap(overridesRes).map((o) => [o.permission_key as PermissionKey, o.granted]),
    )

    const keys = new Set<PermissionKey>()
    unwrap(defaultsRes)
      .filter((d) => d.role === role)
      .forEach((d) => keys.add(d.permission_key as PermissionKey))

    // Override wins in both directions - that is what makes a revoke work.
    overrides.forEach((granted, key) => {
      if (granted) keys.add(key)
      else keys.delete(key)
    })

    return { keys, overrides }
  },

  async setPermission(
    userId: string,
    key: PermissionKey,
    granted: boolean | null,
    note = '',
  ): Promise<void> {
    const db = requireDb()
    const res = await db.rpc('admin_set_permission', {
      p_user_id: userId,
      p_key: key,
      p_granted: granted,
      p_note: note,
    })
    if (res.error) throw new Error(res.error.message)
  },

  /* ---------------------------------------------------------- invitations -- */

  async invitations(): Promise<Invitation[]> {
    const db = requireDb()
    const rows = unwrap(
      await db.from('invitations').select('*').order('created_at', { ascending: false }),
    )
    return rows.map(rowToInvitation)
  },

  /**
   * Creates a working account.
   *
   * Two steps, and the order matters:
   *
   *   1. `admin_create_account` records the pending account - username, role,
   *      permissions - and returns the login address it mapped to. This is the
   *      privileged half, and RLS is what permits it.
   *   2. `signUp` on an isolated client creates the auth user with the
   *      password the admin chose. `handle_new_user` finds the record from
   *      step 1 and turns it into an active profile.
   *
   * The isolated client is essential: signing up on the shared one would
   * replace the admin's session with the new account's and sign them out.
   *
   * If step 2 fails the record from step 1 is withdrawn, so the username is
   * free to retry rather than appearing permanently taken.
   *
   * Requires "Confirm email" to be OFF in the Supabase project. A username has
   * no mailbox, so a confirmation link could never be followed and the account
   * would be created but unable to sign in - which is a confusing failure to
   * debug, hence the explicit error below.
   */
  async createAccount(input: {
    username: string
    password: string
    fullName?: string
    role: Role
    department?: string
    position?: string
    permissions: PermissionKey[]
    /** Optional real address, for a conventional email login instead. */
    email?: string
    note?: string
  }): Promise<{ username: string; loginEmail: string }> {
    const db = requireDb()

    const created = await db.rpc('admin_create_account', {
      p_username: normaliseUsername(input.username),
      p_full_name: input.fullName ?? null,
      p_role: input.role,
      p_department: input.department ?? null,
      p_position: input.position ?? null,
      p_permissions: input.permissions,
      p_email: input.email ?? null,
      p_note: input.note ?? '',
    })
    if (created.error) throw new Error(created.error.message)

    const row = (created.data as unknown as { invitation_id: string; login_email: string }[])[0]
    if (!row) throw new Error('The account record was not created.')

    const isolated = createIsolatedClient()
    const { data, error } = await isolated.auth.signUp({
      email: row.login_email,
      password: input.password,
      options: { data: { full_name: input.fullName ?? input.username } },
    })

    if (error) {
      // Withdraw the record so the username is not left looking taken.
      await db.rpc('admin_discard_pending_account', { p_invitation_id: row.invitation_id })
      throw new Error(friendlySignUpError(error.message))
    }

    // No session and no confirmed user means the project still requires email
    // confirmation - which a username account can never satisfy.
    if (!data.session && !data.user?.confirmed_at && !data.user?.email_confirmed_at) {
      throw new Error(
        'The account was created but cannot sign in yet: this Supabase project still requires ' +
          'email confirmation, and a username has no mailbox. Turn off Authentication -> ' +
          'Providers -> Email -> "Confirm email", then create the account again.',
      )
    }

    return {
      username: normaliseUsername(input.username),
      loginEmail: row.login_email,
    }
  },

  async revokeInvitation(id: string): Promise<void> {
    const db = requireDb()
    const res = await db.rpc('admin_revoke_invitation', { p_id: id })
    if (res.error) throw new Error(res.error.message)
  },
}

function rowToInvitation(r: {
  id: string
  email: string
  username: string | null
  full_name: string | null
  role: Role
  department: string | null
  position: string | null
  permissions: string[]
  invited_by: string | null
  created_at: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  note: string
}): Invitation {
  return {
    id: r.id,
    email: r.email,
    username: r.username,
    fullName: r.full_name,
    role: r.role,
    department: r.department,
    position: r.position,
    permissions: r.permissions as PermissionKey[],
    invitedBy: r.invited_by,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at,
    revokedAt: r.revoked_at,
    note: r.note,
  }
}

/**
 * Signup errors, in terms an admin creating somebody's account can act on.
 *
 * Only these specific cases are rewritten; anything else passes through, so a
 * genuine configuration problem is not flattened into a generic message.
 */
function friendlySignUpError(message: string): string {
  const m = message.toLowerCase()

  /*
   * These two are the same root cause wearing different hats.
   *
   * With "Confirm email" ON, GoTrue tries to mail a confirmation to the
   * account's internal address. That address has no mailbox, so the send
   * fails and GoTrue blames the address - then rate-limits after a few tries.
   * Neither message mentions the setting that is actually wrong.
   */
  if (m.includes('is invalid') && m.includes('email')) {
    return (
      'Turn off email confirmation in Supabase, then try again. ' +
      '(Authentication → Providers → Email → uncheck "Confirm email".) ' +
      'A username has no mailbox, so the confirmation cannot be delivered - which Supabase ' +
      'reports as an invalid address even though the address is fine.'
    )
  }
  if (m.includes('rate limit') && m.includes('email')) {
    return (
      'Supabase is rate-limiting confirmation emails, which it should not be sending at all. ' +
      'Turn off Authentication → Providers → Email → "Confirm email", then try again.'
    )
  }

  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'That username is already taken.'
  }
  if (m.includes('password should be at least')) {
    return 'Choose a password of at least six characters.'
  }
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return (
      'This Supabase project has sign-ups disabled, which also blocks admins creating ' +
      'accounts. Re-enable it under Authentication -> Providers -> Email; the database ' +
      'still refuses anyone without an invitation, so nobody can self-register.'
    )
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many accounts created just now. Wait a minute and try again.'
  }
  return message
}
