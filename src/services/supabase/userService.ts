import type { Paginated, Role, Team, User } from '@/types'
import { requireDb, unwrap, unwrapMaybe } from '@/lib/supabase'
import type { userService as DemoApi, UserFilters } from '../demo/userService'
import { rowToUser } from '../mappers'
import { logActivity } from './activity'

/**
 * People (§10, §56).
 *
 * Two things here are deliberately not plain table writes:
 *
 *  - Role and status changes go through `admin_set_user_role` /
 *    `admin_set_user_status`. Those RPCs refuse a non-admin caller, refuse to
 *    strip the last active admin, and audit the change - none of which an
 *    UPDATE from the client could guarantee.
 *
 *  - Inviting a user cannot be done from the browser at all. Creating an auth
 *    identity needs the service role key, which must never reach frontend
 *    code (§40). See the comment on `invite`.
 */
export const userService: typeof DemoApi = {
  async list(opts: UserFilters = {}): Promise<Paginated<User>> {
    const db = requireDb()
    const page = opts.page ?? 1
    const pageSize = opts.pageSize ?? 20

    let q = db.from('profiles').select('*', { count: 'exact' })

    if (opts.role && opts.role !== 'all') q = q.eq('role', opts.role)
    if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status)
    if (opts.team && opts.team !== 'all') q = q.eq('department', opts.team)

    const search = opts.search?.trim()
    if (search) {
      const safe = search.replace(/[,()*]/g, ' ').trim()
      if (safe) q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`)
    }

    const sortColumn =
      opts.sortBy === 'name'
        ? 'full_name'
        : opts.sortBy === 'lastActiveAt'
          ? 'last_login_at'
          : opts.sortBy === 'joinedAt'
            ? 'created_at'
            : 'full_name'
    q = q.order(sortColumn, { ascending: (opts.sortDir ?? 'asc') === 'asc', nullsFirst: false })

    // Paginated server-side: the admin table must not download every profile
    // to show twenty of them (§59).
    const from = (page - 1) * pageSize
    q = q.range(from, from + pageSize - 1)

    const { data, error, count } = await q
    if (error) throw new Error(error.message)

    return {
      rows: (data ?? []).map(rowToUser),
      total: count ?? 0,
      page,
      pageSize,
    }
  },

  async all(): Promise<User[]> {
    const db = requireDb()
    const rows = unwrap(await db.from('profiles').select('*').order('full_name'))
    return rows.map(rowToUser)
  },

  async get(id: string): Promise<User | null> {
    const db = requireDb()
    const row = unwrapMaybe(await db.from('profiles').select('*').eq('id', id).maybeSingle())
    return row ? rowToUser(row) : null
  },

  async update(id: string, patch: Partial<User>, _actorId: string): Promise<User> {
    const db = requireDb()

    // Role and status are handled by their own guarded RPCs. Sending them in
    // this UPDATE would be rejected by RLS for a self-edit anyway, and would
    // bypass the last-admin protection for an admin edit.
    if (patch.role) {
      const res = await db.rpc('admin_set_user_role', { p_user_id: id, p_role: patch.role })
      if (res.error) throw new Error(res.error.message)
    }
    if (patch.status) {
      const res = await db.rpc('admin_set_user_status', { p_user_id: id, p_status: patch.status })
      if (res.error) throw new Error(res.error.message)
    }

    const hasProfileEdits =
      patch.name !== undefined ||
      patch.jobTitle !== undefined ||
      patch.team !== undefined ||
      patch.avatarUrl !== undefined

    if (hasProfileEdits) {
      const res = await db
        .from('profiles')
        .update({
          full_name: patch.name,
          position: patch.jobTitle,
          department: patch.team,
          avatar_url: patch.avatarUrl,
        })
        .eq('id', id)
      if (res.error) throw new Error(res.error.message)
    }

    const updated = await this.get(id)
    if (!updated) throw new Error('User not found')
    return updated
  },

  /**
   * Inviting a user is a server-side operation.
   *
   * `auth.admin.inviteUserByEmail` requires the service role key. Putting that
   * key in the frontend would hand every visitor full, RLS-bypassing access to
   * the database - so this deliberately throws rather than quietly doing
   * something lesser.
   *
   * The remaining work is one Edge Function; the shape it needs is documented
   * in docs/SUPABASE.md. Until it exists, an admin adds people from the
   * Supabase dashboard (Authentication -> Users -> Invite) and the signup
   * trigger creates their profile as sales/pending, ready to be activated
   * from the Users screen.
   */
  async invite(
    _input: { name: string; email: string; role: Role; team: Team; jobTitle: string },
    _actorId: string,
  ): Promise<User> {
    throw new Error(
      'Inviting users needs the "invite-user" Edge Function, which is not deployed yet. ' +
        'Until then, invite from the Supabase dashboard (Authentication -> Users); the new ' +
        'account appears here as pending and you can activate it and set their role.',
    )
  },
}

/** Records a role change in the audit log. Exported for the Users screen. */
export async function auditRoleChange(userId: string, name: string, role: Role): Promise<void> {
  await logActivity('user.role_changed', 'profile', userId, name, { to: role })
}
