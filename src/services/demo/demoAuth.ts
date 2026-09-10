import type { Role, User } from '@/types'
import { delay } from '@/lib/delay'
import { DEMO_ADMIN_ID, DEMO_SALES_ID } from '@/mock/users'
import { db, logActivity } from '../store'

/**
 * Offline stand-in for Supabase Auth.
 *
 * Used only when no Supabase project is configured, so the app can be opened
 * and reviewed before the backend exists. It is not a mock that pretends to be
 * real: `authService.isDemoMode` is true throughout, the shell shows a banner,
 * and no write leaves the browser.
 *
 * There is no password check here, because there are no passwords - the seeded
 * accounts have no credentials to verify. That is exactly why this module must
 * never be reachable with Supabase configured; `authService` guards that.
 */

const SESSION_KEY = 'kco.session'

type Listener = (payload: { user: User | null }) => void
const listeners = new Set<Listener>()

function emit(user: User | null) {
  listeners.forEach((l) => l({ user }))
}

function readSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable - the session simply does not persist */
  }
}

function signIn(user: User): User {
  if (user.status === 'inactive') {
    throw new Error('This account has been deactivated. Contact your administrator.')
  }
  writeSessionId(user.id)
  logActivity({ actorId: user.id, action: 'user.login', targetLabel: user.name })
  emit(user)
  return user
}

export const demoAuth = {
  async getSession(): Promise<User | null> {
    const id = readSessionId()
    if (!id) return null
    return db.users.find((u) => u.id === id) ?? null
  },

  onChange(handler: Listener): () => void {
    listeners.add(handler)
    return () => listeners.delete(handler)
  },

  async signInWithPassword(email: string, _password: string): Promise<User> {
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) throw new Error('No demo account uses that email address.')
    return delay(signIn(user), 240)
  },

  async signInAs(role: Role): Promise<User> {
    const id = role === 'admin' ? DEMO_ADMIN_ID : DEMO_SALES_ID
    const user = db.users.find((u) => u.id === id)
    if (!user) throw new Error('The demo accounts are missing.')
    return delay(signIn(user), 200)
  },

  async signInWithGoogle(): Promise<void> {
    throw new Error(
      'Google sign-in needs a Supabase project. Add your credentials to .env.local to enable it.',
    )
  },

  async signUpWithPassword(
    _email: string,
    _password: string,
    _fullName: string,
  ): Promise<{ needsVerification: boolean }> {
    throw new Error('Sign-up needs a Supabase project. Demo mode uses the seeded accounts.')
  },

  async requestPasswordReset(_email: string): Promise<void> {
    throw new Error('Password reset needs a Supabase project, which sends the email.')
  },

  async updatePassword(_newPassword: string): Promise<void> {
    throw new Error('Demo accounts have no password to change.')
  },

  async signOut(): Promise<void> {
    writeSessionId(null)
    emit(null)
    return delay(undefined, 100)
  },
}
