import { createClient } from '@supabase/supabase-js'
import type {
  PostgrestError,
  PostgrestSingleResponse,
  SupabaseClient,
} from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env, isSupabaseConfigured } from './env'

/**
 * The one Supabase client (§52).
 *
 * Everything that touches the database goes through a service in
 * `src/services/`; no component imports this file directly. That keeps query
 * shapes, error handling, and row-to-domain mapping in one layer instead of
 * spread across the UI.
 */
export type Db = SupabaseClient<Database>

/**
 * Null when no project is configured, rather than a client built from empty
 * strings. A half-built client would fail at request time with an opaque
 * network error; a null one makes the services take the demo path explicitly.
 */
export const supabase: Db | null = isSupabaseConfigured
  ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Required for the OAuth redirect flow: the tokens come back in the
        // URL fragment and have to be picked up on load (§55).
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: { 'x-application-name': 'kco-lms' },
      },
    })
  : null

/**
 * Use inside a service that has already established Supabase is in play.
 * Throws rather than returning null so a caller cannot forget to check.
 */
export function requireDb(): Db {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    )
  }
  return supabase
}

/**
 * Unwraps a PostgREST result.
 *
 * Supabase returns errors in the payload instead of rejecting, which makes it
 * easy to read `data` that is actually null. Routing every call through here
 * means an RLS denial surfaces as a thrown error the query layer can show,
 * not as an empty list that looks like "no results".
 *
 * The parameter is Supabase's own response type rather than a hand-written
 * `{ data, error }`. That type is a discriminated union - success carries
 * `data: T, error: null`, failure carries `data: null, error: PostgrestError` -
 * and inferring `T` from a structural stand-in resolves it to `null` off the
 * failure branch, making every call site a type error.
 */
export function unwrap<T>(result: PostgrestSingleResponse<T>): T {
  if (result.error) throw enrich(result.error)
  if (result.data === null) throw new Error('The database returned no data.')
  return result.data
}

/**
 * Same, for queries where zero rows is a legitimate answer.
 *
 * Typed over `PostgrestSingleResponse<T>` rather than the MaybeSingle alias.
 * That alias is itself `PostgrestSingleResponse<T | null>`, so inferring `T`
 * from it means solving `T | null = Row | null`, which TypeScript resolves to
 * `never` - producing a value that narrows to `null` and a call site where
 * every field access is an error. Taking the response directly leaves one
 * type variable to solve and `T` comes back as `Row | null`.
 */
export function unwrapMaybe<T>(result: PostgrestSingleResponse<T>): T {
  if (result.error) throw enrich(result.error)
  return result.data
}

/**
 * Turns a PostgrestError into something worth showing a user.
 *
 * `hint` is where Postgres puts the actionable fix, and PostgREST's own codes
 * carry the difference between "no rows" and "you are not allowed" - both of
 * which arrive as an error here and would otherwise be flattened into the
 * same unhelpful message.
 */
function enrich(error: PostgrestError): Error {
  // 42501 is insufficient_privilege: a column or table grant refused the read.
  // PGRST301 is a missing or expired JWT.
  if (error.code === '42501') {
    return new Error('You do not have permission to do that.')
  }
  if (error.code === 'PGRST301') {
    return new Error('Your session has expired. Sign in again.')
  }
  const detail = error.hint ? ` (${error.hint})` : ''
  return new Error(`${error.message}${detail}`)
}
