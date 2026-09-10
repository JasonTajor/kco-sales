/**
 * Tiny SQL emitter for the seed generator.
 *
 * Deliberately not a query builder. The seed produces one big idempotent
 * script, so what is needed is correct literal quoting and readable output -
 * nothing more. Everything here is applied to a trusted, developer-controlled
 * input (the files under src/data), but the quoting is still done properly:
 * an apostrophe in "Don't interrupt" would otherwise break the script, and
 * that is the same defect as an injection.
 */

/** Quotes a SQL string literal, doubling embedded apostrophes. */
export function lit(v: string | null | undefined): string {
  if (v === null || v === undefined) return 'null'
  return `'${v.replace(/'/g, "''")}'`
}

export function num(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return 'null'
  return String(v)
}

export function bool(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return 'null'
  return v ? 'true' : 'false'
}

/** A Postgres text[] literal. */
export function textArray(items: readonly string[] | null | undefined): string {
  if (!items || items.length === 0) return `'{}'`
  return `array[${items.map(lit).join(', ')}]::text[]`
}

/** An array of a named enum type, e.g. user_role[]. */
export function enumArray(items: readonly string[], type: string): string {
  if (items.length === 0) return `'{}'::public.${type}[]`
  return `array[${items.map(lit).join(', ')}]::public.${type}[]`
}

/** A jsonb literal. */
export function json(value: unknown): string {
  return `${lit(JSON.stringify(value))}::jsonb`
}

/**
 * A deterministic UUID derived from a stable key.
 *
 * The seed must be safe to re-run (§42), which means every row needs an id
 * that does not change between runs - otherwise a second run inserts
 * duplicates instead of updating. Rather than storing a mapping, ids are
 * hashed from the natural key ("module:phone-etiquette"), so the same content
 * always lands on the same id on any machine.
 *
 * This is UUID v5's idea (name-based, namespaced) implemented with a small
 * FNV-based mixer, because the seed generator must not pull in a dependency
 * just to hash a string. It is not cryptographic and does not need to be:
 * the only requirement is stability plus enough spread to avoid collisions
 * across a few thousand keys.
 */
export function stableUuid(key: string): string {
  // Four independently-seeded 32-bit FNV-1a passes give 128 bits.
  const seeds = [0x811c9dc5, 0x01000193, 0x7fffffff, 0x9e3779b9]
  const words = seeds.map((seed) => {
    let h = seed >>> 0
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    // Extra avalanche so short, similar keys ("lesson:1" vs "lesson:2") do not
    // land in adjacent buckets.
    h ^= h >>> 16
    h = Math.imul(h, 0x7feb352d) >>> 0
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b) >>> 0
    h ^= h >>> 16
    return h >>> 0
  })

  const hex = words.map((w) => w.toString(16).padStart(8, '0')).join('')

  // Stamp version 5 and the RFC 4122 variant so the value is a well-formed
  // UUID and Postgres' uuid type accepts it without complaint.
  const v = '5' + hex.slice(13, 16)
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20)

  return [hex.slice(0, 8), hex.slice(8, 12), v, variant, hex.slice(20, 32)].join('-')
}

/**
 * Builds an idempotent INSERT.
 *
 * `on conflict (id) do update` rather than `do nothing`: editing a lesson in
 * src/data and re-running the seed should update the row, not silently leave
 * the old text in place. Columns not listed are left as they are, which is
 * what protects learner progress and any admin edits made through the CMS
 * from being reset by a re-seed.
 */
export function upsert(
  table: string,
  columns: string[],
  rows: string[][],
  conflictTarget = 'id',
): string {
  if (rows.length === 0) return `-- ${table}: nothing to seed\n`

  const updates = columns
    .filter((c) => c !== conflictTarget && c !== 'created_at')
    .map((c) => `  ${c} = excluded.${c}`)
    .join(',\n')

  return [
    `insert into public.${table} (${columns.join(', ')}) values`,
    rows.map((r) => `  (${r.join(', ')})`).join(',\n'),
    `on conflict (${conflictTarget}) do update set`,
    updates,
    ';',
    '',
  ].join('\n')
}

/** A section banner, so the generated file is navigable. */
export function banner(title: string): string {
  const bar = '-'.repeat(75)
  return `\n-- ${bar}\n-- ${title}\n-- ${bar}\n`
}
