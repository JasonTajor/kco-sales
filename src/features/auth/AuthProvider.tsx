import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role, User } from '@/types'
import { authService, isDemoMode } from '@/services/authService'

/**
 * The authentication abstraction (§9).
 *
 * Consumers see this context and nothing else - no Supabase session, no
 * provider names, no tokens. Adding a second OAuth provider or swapping the
 * backend is a change to `authService`, not to any component.
 */
interface AuthContextValue {
  user: User | null
  /** True until the initial session check settles. Guards route decisions. */
  loading: boolean
  isAdmin: boolean
  /** True when running without a Supabase project; the shell says so. */
  isDemoMode: boolean

  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsVerification: boolean }>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Re-reads the profile after the user edits it, or an admin changes a role. */
  refresh: () => Promise<void>
  /** Demo mode only. Throws when Supabase is connected. */
  signInAs: (role: Role) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Guards against a late resolve from the initial getSession() overwriting a
   * newer state - for instance when an OAuth redirect fires onAuthStateChange
   * while the boot request is still in flight.
   */
  const settled = useRef(false)

  useEffect(() => {
    let cancelled = false

    authService
      .getSession()
      .then((u) => {
        if (cancelled || settled.current) return
        setUser(u)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // Sessions also change without this app asking: a token refresh, a sign-out
    // in another tab, or the return leg of the Google redirect.
    const unsubscribe = authService.onChange(({ user: next }) => {
      if (cancelled) return
      settled.current = true
      setUser(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await authService.signInWithPassword(email, password))
  }, [])

  const signInWithGoogle = useCallback(async () => {
    // Returns while the browser is already navigating to Google; the session
    // arrives through onChange() after the redirect back.
    await authService.signInWithGoogle()
  }, [])

  const signUp = useCallback(
    (email: string, password: string, fullName: string) =>
      authService.signUpWithPassword(email, password, fullName),
    [],
  )

  const requestPasswordReset = useCallback((email: string) => authService.requestPasswordReset(email), [])

  const updatePassword = useCallback((password: string) => authService.updatePassword(password), [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    setUser(await authService.getSession())
  }, [])

  const signInAs = useCallback(async (role: Role) => {
    setUser(await authService.signInAs(role))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      isDemoMode,
      signIn,
      signInWithGoogle,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      refresh,
      signInAs,
    }),
    [
      user,
      loading,
      signIn,
      signInWithGoogle,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      refresh,
      signInAs,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Convenience for pages that cannot render without a signed-in user. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser called outside a protected route')
  return user
}
