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
   * True when the `admin-create-user` Edge Function is deployed.
   *
   * When it is, neither of the settings above matters: the function creates
   * the identity with `email_confirm: true`, so no mail is attempted and no
   * signup is involved. That is why the warning below is suppressed entirely
   * in that case rather than nagging about a setting with no effect.
   */
  edgeFunctionDeployed: boolean
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
      edgeFunctionDeployed: await probeEdgeFunction(),
    }
  } catch {
    // A failed probe must not block the form. The create attempt itself will
    // still report whatever is actually wrong.
    return null
  }
}

/**
 * Is the Edge Function there?
 *
 * Probed with an OPTIONS request, which the function answers for CORS and
 * which creates nothing. An undeployed name returns 404.
 */
async function probeEdgeFunction(): Promise<boolean> {
  try {
    const res = await fetch(`${env.supabaseUrl}/functions/v1/admin-create-user`, {
      method: 'OPTIONS',
      headers: { apikey: env.supabaseAnonKey },
    })
    return res.status !== 404
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

  // The function bypasses both settings, so neither is a problem.
  if (config.edgeFunctionDeployed) return null

  if (config.signupDisabled) {
    return (
      'This Supabase project has sign-ups disabled, which also blocks creating accounts here. ' +
      'Turn it back on under Authentication → Sign In / Providers → Email. The database still ' +
      'refuses anyone you have not created, so nobody can register themselves.'
    )
  }

  if (!config.autoConfirm) {
    return (
      'This project requires email confirmation, and a username has no mailbox - so the ' +
      'confirmation cannot be delivered and Supabase rejects the account, usually reporting ' +
      '"Email address is invalid" or a mail rate limit. Neither is really about the address. ' +
      'Fix it either way: deploy the admin-create-user Edge Function (Dashboard → Edge ' +
      'Functions, code in supabase/functions/admin-create-user), which sends no mail at all — ' +
      'or turn OFF Authentication → Providers → Email → "Confirm email".'
    )
  }

  return null
}
