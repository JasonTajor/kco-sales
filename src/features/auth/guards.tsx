import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '@/types'
import type { PermissionKey } from '@/types/rbac'
import { useAuth } from './AuthProvider'
import { usePermissions } from './PermissionProvider'
import { FullPageSpinner } from '@/components/common/FullPageSpinner'

/** Route-level protection (§23). Navigation hiding alone is not protection. */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner label="Restoring your session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RoleGuard({ allow }: { allow: Role[] }) {
  const { user, loading } = useAuth()

  if (loading) return <FullPageSpinner label="Checking permissions" />
  if (!user) return <Navigate to="/login" replace />
  if (!allow.includes(user.role)) return <Navigate to="/forbidden" replace />
  return <Outlet />
}

/** Inline permission check for conditional UI inside a shared page. */
export function IfRole({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user || !allow.includes(user.role)) return null
  return <>{children}</>
}

/**
 * Route protection by permission rather than by role (§8 extended).
 *
 * `allow` lists permissions; holding any one of them is enough, which is what
 * a screen usually needs - the assessments console is reachable with either
 * `assessments.create` or `assessments.edit`.
 *
 * As with RoleGuard, this is not the security boundary. Reaching the route
 * without the permission would show an admin screen whose every query returns
 * nothing and whose every write is refused; sending the user to /forbidden is
 * simply a better way to say so.
 */
export function PermissionGuard({ allow }: { allow: PermissionKey[] }) {
  const { user, loading } = useAuth()
  const { ready, canAny, loadError } = usePermissions()

  if (loading || !ready) return <FullPageSpinner label="Checking permissions" />
  if (!user) return <Navigate to="/login" replace />

  /*
   * If the permission set could not be loaded, fall back to the role check
   * rather than denying.
   *
   * Denying looks safer and is actually worse: it locks an administrator out
   * of the console over a dropped request, with no way back. And it buys
   * nothing, because this guard is not the security boundary - every table and
   * RPC behind these screens is governed by RLS, so an admin who gets through
   * here still cannot do anything the database would refuse.
   */
  if (loadError) {
    if (user.role === 'admin') return <Outlet />
    return <Navigate to="/forbidden" replace />
  }

  if (!canAny(...allow)) return <Navigate to="/forbidden" replace />
  return <Outlet />
}

/** Inline permission check for conditional UI inside a shared page. */
export function IfCan({
  allow,
  children,
  fallback = null,
}: {
  allow: PermissionKey | PermissionKey[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { canAny } = usePermissions()
  const list = Array.isArray(allow) ? allow : [allow]
  return <>{canAny(...list) ? children : fallback}</>
}
