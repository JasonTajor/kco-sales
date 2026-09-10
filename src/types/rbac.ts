/**
 * Role-based access control types.
 *
 * `role` remains the coarse gate (admin sees the console, sales does not).
 * A permission is what decides whether a particular action is allowed, and
 * permissions are adjustable per person - so "a sales user who may edit
 * content" and "an admin who may not change roles" are both expressible.
 *
 * Keys mirror `public.permissions` exactly. They are typed as a union rather
 * than `string` so a typo in a guard is a compile error, not a silently
 * denied action.
 */
export const PERMISSION_KEYS = [
  'content.view_drafts',
  'content.create',
  'content.edit',
  'content.publish',
  'content.archive',
  'categories.manage',

  'assessments.create',
  'assessments.edit',
  'assessments.publish',
  'assessments.results',

  'training.manage',
  'scenarios.manage',

  'objections.manage',
  'scripts.manage',
  'quickref.manage',
  'salesbible.edit',
  'salesbible.verify',

  'users.view',
  'users.invite',
  'users.edit',
  'users.set_role',
  'users.set_status',
  'users.permissions',

  'assignments.manage',
  'announcements.manage',

  'competencies.manage',
  'competencies.rate',

  'reports.view',
  'logs.view',
  'settings.manage',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export interface Permission {
  key: PermissionKey
  label: string
  description: string
  category: string
  sortOrder: number
}

/** One person's effective access, as the UI needs it. */
export interface EffectivePermissions {
  /** Everything they can actually do, override and default combined. */
  keys: Set<PermissionKey>
  /** Only the explicit per-person entries, for showing what was customised. */
  overrides: Map<PermissionKey, boolean>
}

export interface Invitation {
  id: string
  /** The internal login address. Usually derived from `username`. */
  email: string
  /** The name the person signs in with. Null for real-email accounts. */
  username: string | null
  fullName: string | null
  role: 'admin' | 'sales'
  department: string | null
  position: string | null
  permissions: PermissionKey[]
  invitedBy: string | null
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  note: string
}

/** What the invitation list shows as a single status. */
export type InvitationState = 'pending' | 'accepted' | 'revoked' | 'expired'

export function invitationState(i: Invitation): InvitationState {
  if (i.acceptedAt) return 'accepted'
  if (i.revokedAt) return 'revoked'
  if (new Date(i.expiresAt) < new Date()) return 'expired'
  return 'pending'
}

/**
 * Permission bundles offered when inviting somebody.
 *
 * Picking thirty checkboxes for every new hire is how permission systems end
 * up unused, so the invite form offers a few sensible starting points and
 * leaves the checkboxes for fine tuning afterwards.
 */
export interface AccessPreset {
  id: string
  label: string
  description: string
  role: 'admin' | 'sales'
  permissions: PermissionKey[]
}

export const ACCESS_PRESETS: AccessPreset[] = [
  {
    id: 'sales-agent',
    label: 'Sales agent',
    description:
      'Takes training, uses the resource libraries, sees only their own progress and results. No management access.',
    role: 'sales',
    permissions: [],
  },
  {
    id: 'senior-agent',
    label: 'Senior agent',
    description:
      'A sales agent who can also see draft materials and rate colleagues against the competency framework.',
    role: 'sales',
    permissions: ['content.view_drafts', 'competencies.rate'],
  },
  {
    id: 'trainer',
    label: 'Trainer',
    description:
      'Writes and publishes learning content, builds assessments, assigns training, and sees the reports - but cannot manage accounts.',
    role: 'admin',
    permissions: [
      'content.view_drafts',
      'content.create',
      'content.edit',
      'content.publish',
      'content.archive',
      'categories.manage',
      'assessments.create',
      'assessments.edit',
      'assessments.publish',
      'assessments.results',
      'training.manage',
      'scenarios.manage',
      'assignments.manage',
      'announcements.manage',
      'competencies.rate',
      'reports.view',
      'users.view',
    ],
  },
  {
    id: 'content-editor',
    label: 'Content editor',
    description:
      'Edits materials and the resource libraries. Cannot publish, assign, or see anyone else’s results.',
    role: 'admin',
    permissions: [
      'content.view_drafts',
      'content.create',
      'content.edit',
      'objections.manage',
      'scripts.manage',
      'quickref.manage',
      'salesbible.edit',
    ],
  },
  {
    id: 'administrator',
    label: 'Administrator',
    description: 'Full access, including accounts and permissions.',
    role: 'admin',
    // Empty because the admin role already grants every permission by
    // default; listing them again would create redundant overrides.
    permissions: [],
  },
]
