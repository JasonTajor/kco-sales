import {
  Activity,
  Bell,
  BookOpen,
  Dumbbell,
  ListChecks,
  Megaphone,
  BarChart3,
  BookMarked,
  Bookmark,
  ClipboardCheck,
  FileStack,
  FolderTree,
  Gauge,
  Home,
  Layers,
  MessageSquareText,
  PhoneCall,
  Settings,
  ShieldQuestion,
  Sparkles,
  Target,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/types'
import type { PermissionKey } from '@/types/rbac'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Roles allowed to see and reach this item. */
  roles: Role[]
  /**
   * Permissions that make this item reachable. Any one is enough.
   *
   * Must match the PermissionGuard on the same route in App.tsx - otherwise
   * the sidebar offers a link that immediately bounces to /forbidden, which is
   * worse than not showing it. Items with no `permissions` are available to
   * anyone whose role allows them.
   */
  permissions?: PermissionKey[]
  /** Match nested routes as active. */
  end?: boolean
}

export interface NavGroup {
  /** Undefined for the top-level items that sit above the first heading. */
  heading?: string
  roles: Role[]
  items: NavItem[]
}

const ALL: Role[] = ['admin', 'sales']
const ADMIN: Role[] = ['admin']

export const navigation: NavGroup[] = [
  {
    roles: ALL,
    items: [{ label: 'Dashboard', to: '/', icon: Home, roles: ALL, end: true }],
  },
  {
    heading: 'Learning',
    roles: ALL,
    items: [
      { label: 'All Materials', to: '/learning/materials', icon: BookMarked, roles: ALL },
      { label: 'Learning Paths', to: '/learning/paths', icon: Layers, roles: ALL },
      { label: 'Categories', to: '/learning/categories', icon: FolderTree, roles: ALL },
      { label: 'Quick Reference', to: '/learning/quick-reference', icon: Bookmark, roles: ALL },
    ],
  },
  {
    heading: 'Training',
    roles: ALL,
    items: [
      { label: 'Activities', to: '/training/activities', icon: Users, roles: ALL },
      { label: 'Assessments', to: '/training/assessments', icon: ClipboardCheck, roles: ALL },
      { label: 'Practice Scenarios', to: '/training/practice', icon: Sparkles, roles: ALL },
    ],
  },
  {
    heading: 'Sales Resources',
    roles: ALL,
    items: [
      { label: 'Phone Etiquette', to: '/resources/phone-scripts', icon: PhoneCall, roles: ALL },
      { label: 'Chat Etiquette', to: '/resources/chat-scripts', icon: MessageSquareText, roles: ALL },
      { label: 'Objection Handling', to: '/resources/objections', icon: ShieldQuestion, roles: ALL },
      { label: 'Closing Techniques', to: '/resources/closing', icon: Target, roles: ALL },
      { label: 'Sales Bible', to: '/resources/sales-bible', icon: BookOpen, roles: ALL },
    ],
  },
  {
    roles: ALL,
    items: [{ label: 'My Progress', to: '/progress', icon: Gauge, roles: ALL }],
  },
  {
    heading: 'Administration',
    roles: ADMIN,
    items: [
      { label: 'Users & Access', to: '/admin/users', icon: UserCog, roles: ADMIN, permissions: ['users.view'] },
      {
        label: 'Assignments',
        to: '/admin/assignments',
        icon: ClipboardCheck,
        roles: ADMIN,
        permissions: ['assignments.manage'],
      },
      {
        label: 'Content',
        to: '/admin/content',
        icon: FileStack,
        roles: ADMIN,
        permissions: ['content.view_drafts', 'content.create', 'content.edit'],
      },
      {
        label: 'Categories',
        to: '/admin/categories',
        icon: FolderTree,
        roles: ADMIN,
        permissions: ['categories.manage'],
      },
      {
        label: 'Assessments',
        to: '/admin/assessments',
        icon: ListChecks,
        roles: ADMIN,
        permissions: ['assessments.create', 'assessments.edit'],
      },
      {
        label: 'Training Modules',
        to: '/admin/training',
        icon: Dumbbell,
        roles: ADMIN,
        permissions: ['training.manage'],
      },
      {
        label: 'Announcements',
        to: '/admin/announcements',
        icon: Megaphone,
        roles: ADMIN,
        permissions: ['announcements.manage'],
      },
      { label: 'Reports', to: '/admin/reports', icon: BarChart3, roles: ADMIN, permissions: ['reports.view'] },
      { label: 'Activity Logs', to: '/admin/logs', icon: Activity, roles: ADMIN, permissions: ['logs.view'] },
    ],
  },
  {
    heading: 'System',
    roles: ALL,
    items: [
      { label: 'Notifications', to: '/notifications', icon: Bell, roles: ALL },
      { label: 'Settings', to: '/settings', icon: Settings, roles: ALL },
    ],
  },
]

/**
 * Groups visible to a role and permission set, with empty groups dropped.
 *
 * `permissions` is optional so callers that genuinely only know the role - the
 * breadcrumb fallback, for instance - still work; passing undefined shows
 * every item the role allows.
 */
export function navigationFor(role: Role, permissions?: Set<PermissionKey>): NavGroup[] {
  const allowed = (item: NavItem) => {
    if (!item.roles.includes(role)) return false
    if (!item.permissions || !permissions) return true
    return item.permissions.some((p) => permissions.has(p))
  }

  return navigation
    .filter((g) => g.roles.includes(role))
    .map((g) => ({ ...g, items: g.items.filter(allowed) }))
    .filter((g) => g.items.length > 0)
}

/** Flat list used by the command menu and breadcrumb fallbacks. */
export function navItemsFor(role: Role, permissions?: Set<PermissionKey>): NavItem[] {
  return navigationFor(role, permissions).flatMap((g) => g.items)
}
