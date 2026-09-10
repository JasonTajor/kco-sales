/**
 * Which backend the service layer is talking to.
 *
 * Decided at BUILD time, not run time, and that distinction is the whole point
 * of this file.
 *
 * Vite statically replaces `import.meta.env.VITE_*` with a literal, so
 * `usingSupabase` collapses to `true` or `false` in the emitted bundle. A
 * `usingSupabase ? a : b` expression then folds to one branch and Rollup drops
 * the other import entirely - which matters because the demo store carries the
 * whole seeded content library (~230 kB of transcribed training material) and
 * shipping it to a browser that will only ever talk to Supabase is pure waste.
 *
 * Reading through `src/lib/env.ts` instead would defeat this: that module
 * trims and validates the values at run time, so the result is opaque to the
 * bundler. The duplication here is deliberate and the two must agree - hence
 * the assertion below, which runs in development only.
 */

/** Mirrors `looksReal` in src/lib/env.ts. Must stay statically analysable. */
const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

export const usingSupabase =
  url.length > 0 &&
  !url.startsWith('your-') &&
  !url.includes('xxxx') &&
  key.length > 0 &&
  !key.startsWith('your-') &&
  !key.includes('xxxx')

if (import.meta.env.DEV) {
  // A drift between this and `isSupabaseConfigured` would mean the app used a
  // Supabase client while the services ran against the demo store, or the
  // reverse - so it is worth shouting about the moment it happens.
  void import('@/lib/env').then(({ isSupabaseConfigured }) => {
    if (isSupabaseConfigured !== usingSupabase) {
      console.error(
        '[kco] backend.ts and lib/env.ts disagree about whether Supabase is configured. ' +
          'Their detection logic has drifted apart.',
      )
    }
  })
}

/**
 * Picks between two implementations of the same interface.
 *
 * Typing both parameters as `T` is the point: the Supabase implementation and
 * the demo one must have identical surfaces, and the compiler is what enforces
 * that. Adding a method to one and not the other is a build error, not a
 * runtime surprise on a screen nobody opened yet.
 *
 * Written as a ternary rather than a function call so the dead branch is
 * eliminable - see the note above.
 */
export function pick<T>(supabaseImpl: T, demoImpl: T): T {
  return usingSupabase ? supabaseImpl : demoImpl
}
