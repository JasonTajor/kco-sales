import type {
  EffectivePermissions,
  Invitation,
  Permission,
  PermissionKey,
} from '@/types/rbac'
import type { Role } from '@/types'
import { requireDb, unwrap } from '@/lib/supabase'
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

  async invite(input: {
    email: string
    fullName?: string
    role: Role
    department?: string
    position?: string
    permissions: PermissionKey[]
    note?: string
  }): Promise<string> {
    const db = requireDb()
    const res = await db.rpc('admin_invite_user', {
      p_email: input.email,
      p_full_name: input.fullName ?? null,
      p_role: input.role,
      p_department: input.department ?? null,
      p_position: input.position ?? null,
      p_permissions: input.permissions,
      p_note: input.note ?? '',
    })
    if (res.error) throw new Error(res.error.message)
    return String(res.data)
  },

  /**
   * Whether an address has a usable invitation.
   *
   * Callable before sign-in - the person has no account yet - which is why it
   * is a definer function returning only a boolean. It leaks whether a given
   * address may register, which the signup attempt itself would reveal anyway.
   */
  async invitationExists(email: string): Promise<boolean> {
    const db = requireDb()
    const res = await db.rpc('invitation_exists', { p_email: email })
    if (res.error) throw new Error(res.error.message)
    return Boolean(res.data)
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
