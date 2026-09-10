import { env, isSupabaseConfigured } from '@/lib/env'

/**
 * The project's auth configuration, as GoTrue reports it.
 *
 * Read because two project settings silently break admin-created accounts, and
 * both produce error messages that point at the wrong thing:
 *
 *  - **Confirm email ON.** GoTrue tries to send a confirmation to the
 *    account's internal address. A username has no mailbox, the send fails,
 *    and GoTrue reports `Email address "andrea@kco.local" is invalid` - which
 *    reads like the domain is wrong when the domain is fine. Repeat attempts
 *    then hit `over_email_send_rate_limit`, which looks like a third,
 *    unrelated problem.
 *
 *  - **Sign-ups disabled.** Account creation uses an ordinary signup under the
 *    hood, so disabling it blocks admins too. The message says nothing about
 *    that.
 *
 * Checking up front turns both into a sentence naming the setting to change,
 * shown before anybody fills in a form.
 *
 * `/auth/v1/settings` is a public, unauthenticated endpoint - it is what the
 * client library reads to decide which providers to offer - so this needs no
 * session and no elevated key.
 */
export interface AuthConfig {
  /** True when accounts are usable immediately, with no email confirmation. */
  autoConfirm: boolean
  /** True when GoTrue refuses signups, which also blocks admin creation. */
  signupDisabled: boolean
  /** True when Google is configured, so the sign-in button will work. */
  googleEnabled: boolean
  /**
   * True when `admin_create_user_account` exists in the database.
   *
   * This is the path that actually matters. It writes the auth identity
   * directly, already confirmed, so no mail is attempted and neither of the
   * settings above has any effect - which is why the warning is suppressed
   * entirely when it is present, rather than nagging about a setting that
   * cannot cause a failure.
   */
  sqlAccountCreation: boolean
}

let cache: Promise<AuthConfig | null> | null = null

async function fetchConfig(): Promise<AuthConfig | null> {
  if (!isSupabaseConfigured) return null

  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseAnonKey },
    })
    if (!res.ok) return null

    const body = (await res.json()) as {
      mailer_autoconfirm?: boolean
      disable_signup?: boolean
      external?: Record<string, boolean>
    }

    return {
      autoConfirm: Boolean(body.mailer_autoconfirm),
      signupDisabled: Boolean(body.disable_signup),
      googleEnabled: Boolean(body.external?.google),
      sqlAccountCreation: await probeSqlAccountCreation(),
    }
  } catch {
    // A failed probe must not block the form. The create attempt itself will
    // still report whatever is actually wrong.
    return null
  }
}

/**
 * Is `admin_create_user_account` present?
 *
 * Probed by calling it with no arguments, which PostgREST answers with
 * PGRST202 when the function does not exist and a different error when it does
 * (the guard or the argument check rejects it). Nothing is created either way.
 *
 * Deliberately not a fetch to /functions/v1 - probing an undeployed Edge
 * Function from the browser fails CORS preflight and logs an alarming error
 * for what is only a capability check.
 */
async function probeSqlAccountCreation(): Promise<boolean> {
  try {
    const res = await fetch(`${env.supabaseUrl}/rest/v1/rpc/admin_create_user_account`, {
      method: 'POST',
      headers: { apikey: env.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (res.status === 404) return false
    const body = await res.text()
    return !/PGRST202|could not find the function/i.test(body)
  } catch {
    return false
  }
}

/** Cached: the answer changes only when somebody edits project settings. */
export function getAuthConfig(): Promise<AuthConfig | null> {
  cache ??= fetchConfig()
  return cache
}

/** Forget the cached answer, after the admin says they have changed a setting. */
export function invalidateAuthConfig(): void {
  cache = null
}

/**
 * What is blocking account creation, in words that name the fix.
 *
 * Returns null when nothing is.
 */
export function accountCreationBlocker(config: AuthConfig | null): string | null {
  if (!config) return null

  // The SQL path bypasses both settings, so neither can cause a failure.
  if (config.sqlAccountCreation) return null

  if (config.signupDisabled) {
    return (
      'This Supabase project has sign-ups disabled, which also blocks creating accounts here. ' +
      'Turn it back on under Authentication → Sign In / Providers → Email. The database still ' +
      'refuses anyone you have not created, so nobody can register themselves.'
    )
  }

  if (!config.autoConfirm) {
    return (
      'Run the migration supabase/migrations/20260910091400_create_account_in_sql.sql in the ' +
      'Supabase SQL Editor. It adds a function that creates the account directly, so no ' +
      'confirmation email is ever attempted and no project setting matters. ' +
      '(Until then this project requires email confirmation, and a username has no mailbox — ' +
      'which Supabase reports as "Email address is invalid" or a mail rate limit, neither of ' +
      'which is really about the address.)'
    )
  }

  return null
}
