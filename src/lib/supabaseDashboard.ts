import { env, isSupabaseConfigured } from './env'

/**
 * Deep links into the Supabase dashboard for this project.
 *
 * The project ref is the first label of the API hostname
 * (`https://<ref>.supabase.co`), so every dashboard URL is derivable from
 * configuration the app already has.
 *
 * Worth doing because "Authentication → Providers → Email → Confirm email" is
 * four levels down a console the reader may not have open, and a instruction
 * they cannot find is the same as no instruction. A link lands on the page.
 */
export function projectRef(): string | null {
  if (!isSupabaseConfigured) return null
  try {
    const host = new URL(env.supabaseUrl).hostname
    const ref = host.split('.')[0]
    // Self-hosted or a custom domain will not follow the convention; a wrong
    // link is worse than none, so only return an obvious project ref.
    return ref && /^[a-z]{16,32}$/.test(ref) ? ref : null
  } catch {
    return null
  }
}

function page(path: string): string | null {
  const ref = projectRef()
  return ref ? `https://supabase.com/dashboard/project/${ref}/${path}` : null
}

/** Where the "Confirm email" toggle lives. */
export const authProvidersUrl = () => page('auth/providers')
/** The SQL Editor, for pasting a migration. */
export const sqlEditorUrl = () => page('sql/new')
/** URL configuration, for the OAuth redirect allow-list. */
export const authUrlConfigUrl = () => page('auth/url-configuration')
