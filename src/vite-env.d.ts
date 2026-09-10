/// <reference types="vite/client" />

/**
 * The environment contract.
 *
 * Declaring these makes a typo in a variable name a compile error rather than
 * a silent `undefined` at runtime. Read through `src/lib/env.ts`, never
 * directly - that module is where "is Supabase configured" is decided.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Older projects call this the anon public key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Newer projects call the same thing the publishable key. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
