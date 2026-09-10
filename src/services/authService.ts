import type { Session } from '@supabase/supabase-js'
import type { Role, User } from '@/types'
import { supabase } from '@/lib/supabase'
import { isSupabaseConfigured } from '@/lib/env'
import { env } from '@/lib/env'
import { demoAuth } from './demo/demoAuth'
import { rowToUser } from './mappers'
import { toLoginEmail } from '@/lib/username'

/**
 * Authentication, abstracted (§9).
 *
 * The rest of the app knows only this module's shape - never a Supabase
 * `Session`, never a provider name. That is what makes adding a second OAuth
 * provider a change to this file alone.
 *
 * Every method has two implementations behind one signature: Supabase when a
 * project is configured, and the local demo store when it is not. The demo
 * path is not a mock of a signed-in user; it is an explicitly labelled
 * offline mode, surfaced in the UI by `isDemoMode` (§71).
 */

export interface AuthChangePayload {
  user: User | null
}

export const isDemoMode = !isSupabaseConfigured

/**
 * Loads the profile row for an authenticated session.
 *
 * A session can legitimately exist without a profile for a moment after an
 * OAuth signup - the trigger runs in the same transaction as the auth insert,
 * but the client may read before its own replica catches up. Returning null
 * lets the caller retry rather than crashing the shell.
 */
async function loadProfile(session: Session | null): Promise<User | null> {
  if (!session?.user || !supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return rowToUser(data)
}

export const authService = {
  isDemoMode,

  async getSession(): Promise<User | null> {
    if (!supabase) return demoAuth.getSession()

    const { data, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message)
    return loadProfile(data.session)
  },

  /**
   * Subscribes to session changes.
   *
   * Needed because a session can change without this app asking: a token
   * refresh, a sign-out in another tab, or the redirect back from Google.
   * Returns an unsubscribe function.
   */
  onChange(handler: (payload: AuthChangePayload) => void): () => void {
    if (!supabase) return demoAuth.onChange(handler)

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION is handled by getSession() during boot; acting on it
      // here as well would render the shell twice on every load.
      if (event === 'INITIAL_SESSION') return

      void loadProfile(session)
        .then((user) => handler({ user }))
        .catch(() => handler({ user: null }))
    })

    return () => data.subscription.unsubscribe()
  },

  /**
   * Signs in with a username or an email address.
   *
   * Accounts are created by an admin with a username, which maps to an
   * internal address (`andrea` -> `andrea@kco.local`). The mapping is done
   * here rather than at the call site so every entry point behaves the same,
   * and locally rather than by lookup so nothing is revealed about which
   * usernames exist.
   *
   * An address is passed through untouched, so accounts created from a real
   * email keep working.
   */
  async signInWithPassword(identifier: string, password: string): Promise<User> {
    const email = toLoginEmail(identifier)
    if (!supabase) return demoAuth.signInWithPassword(email, password)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw new Error(friendlyAuthError(error.message))

    const user = await loadProfile(data.session)
    if (!user) throw new Error('Your account has no profile yet. Ask an admin to finish setting it up.')

    if (user.status === 'inactive') {
      // Sign straight back out: RLS would deny everything anyway, so leaving
      // the session in place would produce an app full of empty screens
      // rather than a clear message.
      await supabase.auth.signOut()
      throw new Error('This account has been deactivated. Contact your administrator.')
    }

    // Fire-and-forget: a failed timestamp write must not fail a valid sign-in.
    void supabase.rpc('touch_last_login')
    void supabase.rpc('log_activity', {
      p_action: 'user.login',
      p_entity_type: 'profile',
      p_entity_id: user.id,
      p_target_label: user.name,
    })

    return user
  },

  /**
   * Starts the Google OAuth round trip (§55).
   *
   * This function returns while the browser is navigating away; the session is
   * picked up on the way back by `detectSessionInUrl` and surfaced through
   * onChange(). Nothing here needs the client ID or secret - those live in the
   * Supabase dashboard, which is why enabling Google requires no code change.
   */
  async signInWithGoogle(): Promise<void> {
    if (!supabase) return demoAuth.signInWithGoogle()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${env.siteUrl}/auth/callback`,
        queryParams: {
          // Ask for a refresh token and let the user pick an account rather
          // than silently reusing the one Google last used.
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
    if (error) throw new Error(error.message)
  },

  /**
   * Self-service signup.
   *
   * Retained because the database refuses it - `handle_new_user` requires a
   * matching record - so it is the honest way to report "you cannot register
   * yourself" rather than hiding the button and leaving people guessing.
   */
  async signUpWithPassword(email: string, password: string, fullName: string): Promise<{ needsVerification: boolean }> {
    if (!supabase) return demoAuth.signUpWithPassword(email, password, fullName)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${env.siteUrl}/auth/callback`,
      },
    })
    if (error) throw new Error(friendlyAuthError(error.message))

    // The signup trigger creates the profile as sales/pending, so a new
    // account can sign in but sees nothing until an admin activates it.
    return { needsVerification: !data.session }
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (!supabase) return demoAuth.requestPasswordReset(email)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${env.siteUrl}/auth/reset-password`,
    })
    if (error) throw new Error(error.message)
  },

  /** Completes a reset, or changes the password of a signed-in user. */
  async updatePassword(newPassword: string): Promise<void> {
    if (!supabase) return demoAuth.updatePassword(newPassword)

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(friendlyAuthError(error.message))
  },

  async signOut(): Promise<void> {
    if (!supabase) return demoAuth.signOut()
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  /**
   * Demo-mode only. Lets a reviewer look at both roles without a database.
   * Guarded so it cannot be reached when Supabase is configured - role is a
   * server-side fact there, and this would be a privilege escalation.
   */
  async signInAs(role: Role): Promise<User> {
    if (supabase) throw new Error('Role switching is disabled when Supabase is connected.')
    return demoAuth.signInAs(role)
  },
}

/**
 * Supabase's auth errors are accurate but terse, and a couple of them are
 * routinely misread by users. Only these specific cases are rewritten;
 * anything else is passed through rather than flattened into a generic
 * "something went wrong", which would hide real configuration problems.
 */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'That email and password do not match an account.'
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email address first - check your inbox for the link.'
  }
  if (m.includes('user already registered')) {
    return 'An account with that email already exists.'
  }
  if (m.includes('password should be at least')) {
    return 'Choose a password of at least six characters.'
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  return message
}
