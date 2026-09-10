import type {
  EffectivePermissions,
  Invitation,
  Permission,
  PermissionKey,
} from '@/types/rbac'
import { PERMISSION_KEYS } from '@/types/rbac'
import type { Role } from '@/types'
import { delay } from '@/lib/delay'
import { uid } from '@/lib/id'
import { db, persist } from '../store'

/**
 * Permissions and invitations, offline.
 *
 * The catalogue mirrors `public.permissions` from migration 0011. It is
 * duplicated here rather than imported from the seed generator because that
 * module is a build-time script; the labels below and the migration's INSERT
 * are the same text and must be kept in step.
 *
 * The rule is identical to the database's `can()`: a per-person override wins
 * in either direction, otherwise the role default applies, otherwise denied.
 */

const CATALOGUE: Permission[] = [
  ['content.view_drafts', 'View drafts', 'See unpublished materials.', 'Content'],
  ['content.create', 'Create materials', 'Add new modules and lessons.', 'Content'],
  ['content.edit', 'Edit materials', 'Change existing modules, lessons and blocks.', 'Content'],
  ['content.publish', 'Publish materials', 'Make a material visible to sales users.', 'Content'],
  ['content.archive', 'Archive materials', 'Withdraw a material without deleting it.', 'Content'],
  ['categories.manage', 'Manage categories', 'Add, rename and remove categories.', 'Content'],

  ['assessments.create', 'Create assessments', 'Add new assessments.', 'Assessments'],
  ['assessments.edit', 'Edit assessments', 'Change questions, options and answer keys.', 'Assessments'],
  ['assessments.publish', 'Publish assessments', 'Make an assessment available to take.', 'Assessments'],
  ['assessments.results', 'View all results', "See every learner's attempts and scores.", 'Assessments'],

  ['training.manage', 'Manage activities', 'Add and edit facilitator-led activities.', 'Training'],
  ['scenarios.manage', 'Manage scenarios', 'Add and edit practice scenarios.', 'Training'],

  ['objections.manage', 'Manage objections', 'Edit the objection handling library.', 'Resources'],
  ['scripts.manage', 'Manage scripts', 'Edit the script library.', 'Resources'],
  ['quickref.manage', 'Manage quick reference', 'Edit the quick reference cards.', 'Resources'],
  ['salesbible.edit', 'Edit Sales Bible', 'Fill in Sales Bible fields.', 'Resources'],
  ['salesbible.verify', 'Verify Sales Bible', 'Mark a Sales Bible value as management-approved.', 'Resources'],

  ['users.view', 'View people', 'See the team roster and account details.', 'People'],
  ['users.invite', 'Invite people', 'Create an invitation so someone can join.', 'People'],
  ['users.edit', 'Edit people', "Change someone's name, department or position.", 'People'],
  ['users.set_role', 'Change roles', 'Move someone between admin and sales.', 'People'],
  ['users.set_status', 'Activate / deactivate', 'Suspend or reinstate an account.', 'People'],
  ['users.permissions', 'Manage permissions', 'Grant or revoke individual permissions.', 'People'],

  ['assignments.manage', 'Assign training', 'Assign modules, paths and assessments.', 'Delivery'],
  ['announcements.manage', 'Manage announcements', 'Post and withdraw announcements.', 'Delivery'],

  ['competencies.manage', 'Manage competencies', 'Edit the competency framework.', 'Development'],
  ['competencies.rate', 'Rate competencies', 'Score a learner against the framework.', 'Development'],

  ['reports.view', 'View reports', 'Open the admin reports.', 'Oversight'],
  ['logs.view', 'View activity log', 'Read the audit trail.', 'Oversight'],
  ['settings.manage', 'Manage settings', 'Change system settings.', 'Oversight'],
].map(([key, label, description, category], i) => ({
  key: key as PermissionKey,
  label: label!,
  description: description!,
  category: category!,
  sortOrder: i,
}))

/** Admin holds everything; sales holds nothing by default. */
const ROLE_DEFAULTS: Record<Role, PermissionKey[]> = {
  admin: [...PERMISSION_KEYS],
  sales: [],
}

interface LocalState {
  overrides: Record<string, Partial<Record<PermissionKey, boolean>>>
  invitations: Invitation[]
}

function load(): LocalState {
  try {
    const raw = localStorage.getItem('kco.rbac')
    if (raw) return JSON.parse(raw) as LocalState
  } catch {
    /* fall through */
  }
  return { overrides: {}, invitations: [] }
}

const state = load()
const save = () => persist('rbac', state)

function currentUserId(): string | null {
  try {
    return localStorage.getItem('kco.session')
  } catch {
    return null
  }
}

function effective(userId: string): EffectivePermissions {
  const user = db.users.find((u) => u.id === userId)
  const keys = new Set<PermissionKey>(user ? ROLE_DEFAULTS[user.role] : [])

  const overrides = new Map<PermissionKey, boolean>(
    Object.entries(state.overrides[userId] ?? {}).map(([k, v]) => [k as PermissionKey, Boolean(v)]),
  )
  overrides.forEach((granted, key) => {
    if (granted) keys.add(key)
    else keys.delete(key)
  })

  // A deactivated account holds nothing, matching `can()`.
  if (user?.status !== 'active') keys.clear()

  return { keys, overrides }
}

export const rbacService = {
  async permissions(): Promise<Permission[]> {
    return delay(CATALOGUE, 60)
  },

  async roleDefaults(): Promise<Record<Role, PermissionKey[]>> {
    return delay(ROLE_DEFAULTS, 60)
  },

  async mine(): Promise<Set<PermissionKey>> {
    const id = currentUserId()
    return delay(id ? effective(id).keys : new Set<PermissionKey>(), 60)
  },

  async forUser(userId: string): Promise<EffectivePermissions> {
    return delay(effective(userId), 80)
  },

  async setPermission(
    userId: string,
    key: PermissionKey,
    granted: boolean | null,
    _note = '',
  ): Promise<void> {
    const me = currentUserId()
    if (!me || !effective(me).keys.has('users.permissions')) {
      throw new Error('You do not have permission to manage permissions')
    }

    const forUser = state.overrides[userId] ?? {}
    if (granted === null) delete forUser[key]
    else forUser[key] = granted
    state.overrides[userId] = forUser

    // Mirrors the database guard: never leave nobody able to manage access.
    if (key === 'users.permissions') {
      const anyone = db.users.some(
        (u) => u.status === 'active' && effective(u.id).keys.has('users.permissions'),
      )
      if (!anyone) {
        // Roll the change back before reporting it.
        if (granted === null) forUser[key] = true
        else delete forUser[key]
        state.overrides[userId] = forUser
        throw new Error(
          'That would leave nobody able to manage permissions. Grant it to someone else first.',
        )
      }
    }

    save()
    return delay(undefined, 140)
  },

  async invitations(): Promise<Invitation[]> {
    return delay(state.invitations, 80)
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
    const email = input.email.trim().toLowerCase()

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error(`An account already exists for ${email}`)
    }

    // Supersede any outstanding invitation, as the RPC does.
    state.invitations.forEach((i) => {
      if (i.email === email && !i.acceptedAt && !i.revokedAt) i.revokedAt = new Date().toISOString()
    })

    const invitation: Invitation = {
      id: uid('inv'),
      email,
      fullName: input.fullName ?? null,
      role: input.role,
      department: input.department ?? null,
      position: input.position ?? null,
      permissions: input.permissions,
      invitedBy: currentUserId(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      acceptedAt: null,
      revokedAt: null,
      note: input.note ?? '',
    }

    state.invitations.unshift(invitation)
    save()
    return delay(invitation.id, 200)
  },

  async invitationExists(email: string): Promise<boolean> {
    const address = email.trim().toLowerCase()
    return delay(
      state.invitations.some(
        (i) =>
          i.email === address &&
          !i.acceptedAt &&
          !i.revokedAt &&
          new Date(i.expiresAt) > new Date(),
      ),
      80,
    )
  },

  async revokeInvitation(id: string): Promise<void> {
    const invitation = state.invitations.find((i) => i.id === id)
    if (!invitation) throw new Error('That invitation does not exist')
    if (invitation.acceptedAt) throw new Error('That invitation has already been accepted')
    invitation.revokedAt = new Date().toISOString()
    save()
    return delay(undefined, 140)
  },
}
