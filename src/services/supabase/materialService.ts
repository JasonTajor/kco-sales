import type { Category, ContentStatus, LearningPath, Material, MaterialSection } from '@/types'
import { requireDb, unwrap, unwrapMaybe } from '@/lib/supabase'
import type { materialService as DemoApi } from '../demo/materialService'
import type { MaterialFilters } from '../demo/materialService'
import {
  blockToRow,
  rowToBlock,
  rowToCategory,
  rowToMaterial,
  rowToPath,
  rowToSection,
} from '../mappers'
import { logActivity } from './activity'

/**
 * Learning content, backed by Supabase.
 *
 * Typed as `typeof DemoApi` so the compiler enforces that this implementation
 * and the demo one expose exactly the same surface. If a method is added to
 * one and not the other, this file stops compiling - which is the only
 * reliable way to keep two backends behind one interface.
 *
 * Note what is NOT filtered here: draft and archived modules. RLS already
 * hides those from a sales user, so the client never needs to ask for
 * "published only" - it simply cannot see anything else. The status filter
 * below exists for the admin content table, where all three are visible.
 */

/**
 * A module with its lessons and blocks, in one request.
 *
 * PostgREST resolves the nested selects through the foreign keys generated
 * into `src/types/database.ts`, so this is a single round trip rather than
 * 1 + N + N*M queries - which is what §59 is asking for.
 */
const MODULE_TREE = `
  *,
  lessons (
    *,
    content_blocks ( * )
  )
`

type NestedModule = {
  lessons?: (Record<string, unknown> & { content_blocks?: Record<string, unknown>[] })[]
} & Record<string, unknown>

/** Assembles the nested payload into a domain Material. */
function assemble(row: NestedModule): Material {
  const lessons = [...(row.lessons ?? [])]
    .filter((l) => l.status !== 'archived')
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))

  const sections: MaterialSection[] = lessons.map((l, i) =>
    rowToSection(
      l as never,
      [...(l.content_blocks ?? [])]
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        .map((b) => rowToBlock(b as never)),
      i,
    ),
  )

  return rowToMaterial(row as never, sections)
}

export const materialService: typeof DemoApi = {
  async list(filters: MaterialFilters = {}): Promise<Material[]> {
    const db = requireDb()

    // The list needs lesson titles for search and section counts for the card,
    // but not every block - so the tree is trimmed to one level here.
    let q = db.from('modules').select('*, lessons ( id, title, summary, sort_order, status )')

    if (filters.categoryId && filters.categoryId !== 'all') q = q.eq('category_id', filters.categoryId)
    if (filters.difficulty && filters.difficulty !== 'all') q = q.eq('difficulty', filters.difficulty)
    if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status)
    if (filters.tag && filters.tag !== 'all') q = q.contains('tags', [filters.tag])
    if (filters.audience) q = q.contains('audience', [filters.audience])

    const search = filters.search?.trim()
    if (search) {
      // Escape the PostgREST `or` grammar: a comma or parenthesis in the query
      // would otherwise be read as syntax and produce a 400.
      const safe = search.replace(/[,()*]/g, ' ').trim()
      if (safe) q = q.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
    }

    const sortBy = filters.sortBy ?? 'module'
    if (sortBy === 'title') q = q.order('title')
    else if (sortBy === 'duration') q = q.order('duration_minutes')
    else if (sortBy === 'updated') q = q.order('updated_at', { ascending: false })
    else q = q.order('module_number')

    const rows = unwrap(await q)
    let materials = rows.map((r) => assemble(r as never))

    /**
     * Completion filters need the learner's progress, which lives in another
     * table. Fetched as a second request and joined in memory rather than
     * embedded, because module_progress has no foreign key to modules that
     * PostgREST could traverse in this direction for a filtered subset.
     */
    if (filters.completion && filters.completion !== 'all' && filters.userId) {
      if (filters.completion === 'favorites') {
        const favs = unwrap(
          await db
            .from('favorites')
            .select('target_id')
            .eq('user_id', filters.userId)
            .eq('target_type', 'module'),
        )
        const ids = new Set(favs.map((f) => f.target_id))
        materials = materials.filter((m) => ids.has(m.id))
      } else {
        const progress = unwrap(
          await db.from('module_progress').select('module_id, state').eq('user_id', filters.userId),
        )
        const state = new Map(progress.map((p) => [p.module_id, p.state]))
        materials = materials.filter(
          (m) => (state.get(m.id) ?? 'not-started') === filters.completion,
        )
      }
    }

    return materials
  },

  async get(idOrSlug: string): Promise<Material | null> {
    const db = requireDb()

    // A uuid means it came from a link inside the app; anything else is a slug
    // from the address bar.
    const column = isUuid(idOrSlug) ? 'id' : 'slug'
    const row = unwrapMaybe(
      await db.from('modules').select(MODULE_TREE).eq(column, idOrSlug).maybeSingle(),
    )
    return row ? assemble(row as never) : null
  },

  async categories(): Promise<Category[]> {
    const db = requireDb()
    const rows = unwrap(await db.from('categories').select('*').order('sort_order').order('name'))
    return rows.map(rowToCategory)
  },

  async createCategory(input: Omit<Category, 'id'>): Promise<Category> {
    const db = requireDb()
    const row = unwrap(
      await db
        .from('categories')
        .insert({
          slug: input.slug,
          name: input.name,
          description: input.description,
          accent: input.accent,
          icon: input.icon,
        })
        .select('*')
        .single(),
    )
    return rowToCategory(row)
  },

  async updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
    const db = requireDb()
    const row = unwrap(
      await db
        .from('categories')
        .update({
          name: patch.name,
          slug: patch.slug,
          description: patch.description,
          accent: patch.accent,
          icon: patch.icon,
        })
        .eq('id', id)
        .select('*')
        .single(),
    )
    return rowToCategory(row)
  },

  async deleteCategory(id: string): Promise<void> {
    const db = requireDb()

    // Checked here for a clear message. The database also protects itself:
    // modules.category_id is ON DELETE SET NULL, so the worst case is
    // uncategorised modules rather than lost ones.
    const { count, error } = await db
      .from('modules')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
    if (error) throw new Error(error.message)
    if ((count ?? 0) > 0) {
      throw new Error(`This category still has ${count} material(s) assigned to it.`)
    }

    const res = await db.from('categories').delete().eq('id', id)
    if (res.error) throw new Error(res.error.message)
  },

  async create(input: Partial<Material>, actorId: string): Promise<Material> {
    const db = requireDb()
    const title = input.title?.trim() || 'Untitled material'

    const row = unwrap(
      await db
        .from('modules')
        .insert({
          slug: await uniqueSlug(slugify(title)),
          title,
          description: input.description ?? '',
          category_id: input.categoryId || null,
          module_number: await nextModuleNumber(),
          status: 'draft',
          difficulty: input.difficulty ?? 'foundation',
          duration_minutes: input.duration ?? 10,
          audience: input.audience ?? ['sales'],
          teams: input.teams ?? [],
          tags: input.tags ?? [],
          created_by: actorId,
          updated_by: actorId,
        })
        .select('*')
        .single(),
    )

    // A module with no lessons cannot be published (the seed verification
    // checks for exactly that), so a new one starts with an empty first lesson
    // rather than nothing.
    const lesson = unwrap(
      await db
        .from('lessons')
        .insert({ module_id: row.id, title: 'Untitled section', sort_order: 0, status: 'draft' })
        .select('*')
        .single(),
    )

    await logActivity('material.created', 'module', row.id, title)
    return rowToMaterial(row, [rowToSection(lesson, [], 0)])
  },

  async update(id: string, patch: Partial<Material>, _actorId: string): Promise<Material> {
    const db = requireDb()

    // Sections are a separate table; they go through saveSections().
    const row = unwrap(
      await db
        .from('modules')
        .update({
          title: patch.title,
          description: patch.description,
          category_id: patch.categoryId,
          difficulty: patch.difficulty,
          duration_minutes: patch.duration,
          audience: patch.audience,
          teams: patch.teams,
          tags: patch.tags,
          status: patch.status,
          needs_claim_review: patch.needsClaimReview,
        })
        .eq('id', id)
        .select('*')
        .single(),
    )

    if (patch.sections) await this.saveSections(id, patch.sections, _actorId)

    await logActivity('material.updated', 'module', id, row.title)
    const full = await this.get(id)
    return full ?? rowToMaterial(row)
  },

  async setStatus(id: string, status: ContentStatus, _actorId: string): Promise<Material> {
    const db = requireDb()

    const row = unwrap(
      await db
        .from('modules')
        // published_at / published_by are stamped by the database trigger, so
        // publishing is one field change and cannot be half-recorded.
        .update({ status, published_at: status === 'published' ? new Date().toISOString() : undefined })
        .eq('id', id)
        .select('*')
        .single(),
    )

    await logActivity(
      status === 'published'
        ? 'material.published'
        : status === 'archived'
          ? 'material.archived'
          : 'material.updated',
      'module',
      id,
      row.title,
    )

    const full = await this.get(id)
    return full ?? rowToMaterial(row)
  },

  async duplicate(id: string, actorId: string): Promise<Material> {
    const source = await this.get(id)
    if (!source) throw new Error('Material not found')

    const copy = await this.create(
      {
        title: `${source.title} (copy)`,
        description: source.description,
        categoryId: source.categoryId,
        difficulty: source.difficulty,
        duration: source.duration,
        audience: source.audience,
        teams: source.teams,
        tags: source.tags,
      },
      actorId,
    )

    // create() seeded an empty lesson; replacing the whole set drops it.
    await this.saveSections(copy.id, source.sections, actorId)
    const full = await this.get(copy.id)
    return full ?? copy
  },

  /**
   * Replaces a module's lesson tree.
   *
   * Sections are deleted and rewritten rather than diffed. Their identity is
   * position - the editor lets an admin reorder, insert and remove freely -
   * and a positional diff on the client would be both fiddly and easy to get
   * wrong. The cascade on content_blocks removes the old blocks with their
   * lessons.
   *
   * The cost is that lesson ids change, which would orphan lesson_progress.
   * Rows whose lesson still exists by title are therefore preserved: an admin
   * fixing a typo must not reset everyone's progress.
   */
  async saveSections(id: string, sections: MaterialSection[], _actorId: string): Promise<Material> {
    const db = requireDb()

    const existing = unwrap(await db.from('lessons').select('id, title').eq('module_id', id))
    const idByTitle = new Map(existing.map((l) => [l.title, l.id]))

    const del = await db.from('lessons').delete().eq('module_id', id)
    if (del.error) throw new Error(del.error.message)

    if (sections.length > 0) {
      const lessons = unwrap(
        await db
          .from('lessons')
          .insert(
            sections.map((s, i) => ({
              // Reuse the previous id when the title is unchanged, so
              // lesson_progress rows survive an edit.
              id: idByTitle.get(s.title),
              module_id: id,
              title: s.title,
              summary: s.summary ?? '',
              sort_order: i,
              status: 'published' as const,
            })),
          )
          .select('id, title, sort_order'),
      )

      const lessonIdByOrder = new Map(lessons.map((l) => [l.sort_order, l.id]))

      const blocks = sections.flatMap((s, i) => {
        const lessonId = lessonIdByOrder.get(i)
        if (!lessonId) return []
        return s.blocks.map((b, bi) => blockToRow(b, lessonId, bi))
      })

      if (blocks.length > 0) {
        const res = await db.from('content_blocks').insert(blocks)
        if (res.error) throw new Error(res.error.message)
      }
    }

    const full = await this.get(id)
    if (!full) throw new Error('Material not found after saving sections')
    return full
  },

  /**
   * Learning paths, with their ordered module list.
   *
   * `learning_path_items` carries the ordering, and estimated minutes are
   * summed from the modules rather than stored on the path - a stored total
   * would drift the moment a module's duration changed.
   */
  async paths(): Promise<LearningPath[]> {
    const db = requireDb()

    const rows = unwrap(
      await db
        .from('learning_paths')
        .select('*, learning_path_items ( module_id, sort_order, modules ( duration_minutes ) )')
        .order('created_at'),
    ) as unknown as (Record<string, unknown> & {
      learning_path_items?: {
        module_id: string | null
        sort_order: number
        modules: { duration_minutes: number } | null
      }[]
    })[]

    return rows.map((r) => {
      const items = [...(r.learning_path_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      return rowToPath(
        r as never,
        items.map((i) => i.module_id).filter((id): id is string => Boolean(id)),
        items.reduce((sum, i) => sum + (i.modules?.duration_minutes ?? 0), 0),
      )
    })
  },

  async path(idOrSlug: string): Promise<LearningPath | null> {
    const all = await this.paths()
    return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null
  },

  async tags(): Promise<string[]> {
    const db = requireDb()
    const rows = unwrap(await db.from('modules').select('tags'))
    const set = new Set<string>()
    rows.forEach((r) => r.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  },
}

/* --------------------------------------------------------------- helpers --- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (v: string) => UUID_RE.test(v)

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled'
  )
}

/**
 * modules.slug is unique, so a second "Phone Etiquette" would fail the insert.
 * Suffixing keeps the admin's create action working instead of surfacing a
 * constraint violation they cannot act on.
 */
async function uniqueSlug(base: string): Promise<string> {
  const db = requireDb()
  const rows = unwrap(await db.from('modules').select('slug').like('slug', `${base}%`))
  const taken = new Set(rows.map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let n = 2; n < 200; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

async function nextModuleNumber(): Promise<number> {
  const db = requireDb()
  const rows = unwrap(
    await db.from('modules').select('module_number').order('module_number', { ascending: false }).limit(1),
  )
  return (rows[0]?.module_number ?? 0) + 1
}
