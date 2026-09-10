import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PermissionKey } from '@/types/rbac'
import { rbacService } from '@/services'
import { useAuth } from './AuthProvider'

/**
 * The caller's effective permissions.
 *
 * Loaded from the database (`my_permissions()`) rather than derived on the
 * client, so a guard here and a policy there are answering the same question
 * with the same code. A client-side reimplementation would eventually
 * disagree, and every disagreement is either a feature the user cannot reach
 * or a button that fails when pressed.
 *
 * This is a usability layer, never a security boundary. Hiding a button does
 * not protect anything - the RLS policies and the guarded RPCs do that, and
 * they are tested independently in supabase/tests/rls.test.sql.
 */
interface PermissionContextValue {
  /** True once the set has been fetched; guards wait rather than flicker. */
  ready: boolean
  keys: Set<PermissionKey>
  /** Does the current user hold this permission? */
  can: (key: PermissionKey) => boolean
  /** Any one of these? */
  canAny: (...keys: PermissionKey[]) => boolean
  /** All of these? */
  canAll: (...keys: PermissionKey[]) => boolean
  reload: () => void
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [keys, setKeys] = useState<Set<PermissionKey>>(new Set())
  const [ready, setReady] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!user) {
      setKeys(new Set())
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    rbacService
      .mine()
      .then((next) => {
        if (!cancelled) setKeys(next)
      })
      .catch(() => {
        // Failing closed is the safe direction: an empty set hides admin
        // affordances rather than showing ones that will be refused.
        if (!cancelled) setKeys(new Set())
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [user, nonce])

  const can = useCallback((key: PermissionKey) => keys.has(key), [keys])
  const canAny = useCallback((...list: PermissionKey[]) => list.some((k) => keys.has(k)), [keys])
  const canAll = useCallback((...list: PermissionKey[]) => list.every((k) => keys.has(k)), [keys])
  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const value = useMemo<PermissionContextValue>(
    () => ({ ready, keys, can, canAny, canAll, reload }),
    [ready, keys, can, canAny, canAll, reload],
  )

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext)
  if (!ctx) throw new Error('usePermissions must be used inside <PermissionProvider>')
  return ctx
}

/** Shorthand for the common single-permission check. */
export function useCan(key: PermissionKey): boolean {
  return usePermissions().can(key)
}
