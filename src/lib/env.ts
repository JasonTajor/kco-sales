/**
 * Environment access, in one place.
 *
 * The app has to run in two situations: connected to a Supabase project, and
 * not connected to one yet. Rather than scattering `import.meta.env` checks
 * and optional-chaining through the service layer, the decision is made once
 * here and exposed as `isSupabaseConfigured`.
 *
 * Nothing secret belongs in this file. Vite inlines every VITE_-prefixed
 * variable into the client bundle, so only the publishable anon key is read -
 * the service role key must never appear in frontend code (§40).
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''

/**
 * Supabase renamed the client-side key from "anon" to "publishable" in 2025.
 * Both names are accepted so a project created under either convention works
 * without editing code.
 */
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim() ??
  ''

/** A placeholder copied from .env.example is not a configuration. */
const looksReal = (v: string) => v.length > 0 && !v.startsWith('your-') && !v.includes('xxxx')

export const env = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  /** Where Supabase should send the user back to after an OAuth round trip. */
  siteUrl: import.meta.env.VITE_SITE_URL?.trim() || window.location.origin,
} as const

/**
 * True when a real Supabase project is reachable.
 *
 * When false the app runs against the local demo store instead, and says so
 * in the UI - it never pretends a write reached a server (§71).
 */
export const isSupabaseConfigured: boolean = looksReal(url) && looksReal(anonKey)
