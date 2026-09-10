import type {
  Announcement,
  Competency,
  CompetencyLevel,
  SalesBibleEntry,
  SalesBibleSection,
  Script,
  UserCompetency,
} from '@/types/resources'
import type { Objection, QuickReferenceCard, WordingPair } from '@/types'
import { requireDb, unwrap } from '@/lib/supabase'
import type { resourceService as DemoApi } from '../demo/resourceService'
import { rowToObjection, rowToQuickReference, rowToWording } from '../mappers'
import { logActivity } from './activity'

/**
 * The sales resource libraries: scripts, objections, quick reference,
 * professional wording, competencies, the Sales Bible, and announcements.
 *
 * §24 is explicit that scripts must not be hardcoded in React components, and
 * the same reasoning applies to the rest: an admin has to be able to fix a
 * wording or correct a price without a deploy.
 */
export const resourceService: typeof DemoApi = {
  /* ------------------------------------------------------------- scripts -- */

  async scripts(filters: { kind?: string; search?: string } = {}): Promise<Script[]> {
    const db = requireDb()

    let q = db.from('scripts').select('*').order('sort_order')
    if (filters.kind && filters.kind !== 'all') q = q.eq('kind', filters.kind)

    const safe = filters.search?.trim().replace(/[,()*]/g, ' ').trim()
    if (safe) q = q.or(`title.ilike.%${safe}%,situation.ilike.%${safe}%`)

    return unwrap(await q).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      kind: r.kind as Script['kind'],
      channel: r.channel as Script['channel'],
      situation: r.situation,
      language: r.language as Script['language'],
      lines: r.lines,
      notes: r.notes,
      tags: r.tags,
    }))
  },

  async saveScript(input: Partial<Script> & { id?: string }): Promise<Script> {
    const db = requireDb()

    const payload = {
      slug: input.slug ?? slugify(input.title ?? 'script'),
      title: input.title ?? 'Untitled script',
      kind: input.kind ?? 'phone',
      channel: input.channel ?? 'both',
      situation: input.situation ?? '',
      language: input.language ?? 'mixed',
      lines: input.lines ?? [],
      notes: input.notes ?? '',
      tags: input.tags ?? [],
    }

    const row = input.id
      ? unwrap(await db.from('scripts').update(payload).eq('id', input.id).select('*').single())
      : unwrap(await db.from('scripts').insert(payload).select('*').single())

    await logActivity(input.id ? 'script.updated' : 'script.created', 'script', row.id, row.title)

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      kind: row.kind as Script['kind'],
      channel: row.channel as Script['channel'],
      situation: row.situation,
      language: row.language as Script['language'],
      lines: row.lines,
      notes: row.notes,
      tags: row.tags,
    }
  },

  async deleteScript(id: string): Promise<void> {
    const db = requireDb()
    const res = await db.from('scripts').delete().eq('id', id)
    if (res.error) throw new Error(res.error.message)
  },

  /* ---------------------------------------------------------- objections -- */

  async objections(filters: { category?: string; search?: string } = {}): Promise<Objection[]> {
    const db = requireDb()

    let q = db.from('objections').select('*').order('objection')
    if (filters.category && filters.category !== 'all') q = q.eq('category', filters.category)

    const safe = filters.search?.trim().replace(/[,()*]/g, ' ').trim()
    if (safe) q = q.or(`objection.ilike.%${safe}%,translation.ilike.%${safe}%`)

    return unwrap(await q).map(rowToObjection)
  },

  async saveObjection(input: Partial<Objection> & { id?: string }): Promise<Objection> {
    const db = requireDb()

    const payload = {
      slug: input.slug ?? slugify(input.objection ?? 'objection'),
      objection: input.objection ?? '',
      translation: input.translation ?? '',
      category: input.category ?? 'price',
      frequency: input.frequency ?? 'medium',
      acknowledge: input.acknowledge ?? '',
      clarify: input.clarify ?? '',
      address: input.address ?? '',
      close: input.close ?? '',
      pitfalls: input.pitfalls ?? [],
      claim_sensitive: input.claimSensitive ?? false,
    }

    const row = input.id
      ? unwrap(await db.from('objections').update(payload).eq('id', input.id).select('*').single())
      : unwrap(await db.from('objections').insert(payload).select('*').single())

    await logActivity(
      input.id ? 'objection.updated' : 'objection.created',
      'objection',
      row.id,
      row.objection,
    )
    return rowToObjection(row)
  },

  /* ------------------------------------------------------ quick reference -- */

  async quickReference(): Promise<QuickReferenceCard[]> {
    const db = requireDb()
    const rows = unwrap(
      await db.from('quick_reference_items').select('*').order('sort_order'),
    )
    return rows.map(rowToQuickReference)
  },

  async wording(): Promise<WordingPair[]> {
    const db = requireDb()
    const rows = unwrap(await db.from('wording_pairs').select('*').order('sort_order'))
    return rows.map(rowToWording)
  },

  /* -------------------------------------------------------- competencies -- */

  async competencies(): Promise<Competency[]> {
    const db = requireDb()
    const rows = unwrap(await db.from('competencies').select('*').order('sort_order'))
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      definition: r.definition,
      cluster: r.cluster as Competency['cluster'],
      behavioralIndicators: r.behavioral_indicators,
    }))
  },

  async competencyLevels(): Promise<CompetencyLevel[]> {
    const db = requireDb()
    const rows = unwrap(await db.from('competency_levels').select('*').order('level'))
    return rows.map((r) => ({ level: r.level, label: r.label, description: r.description }))
  },

  async userCompetencies(userId: string): Promise<UserCompetency[]> {
    const db = requireDb()
    const rows = unwrap(
      await db.from('user_competencies').select('*').eq('user_id', userId),
    )
    return rows.map((r) => ({
      competencyId: r.competency_id,
      level: r.level,
      note: r.note,
      assessedAt: r.assessed_at,
      assessedBy: r.assessed_by,
    }))
  },

  async rateCompetency(
    userId: string,
    competencyId: string,
    level: number,
    note = '',
  ): Promise<void> {
    const db = requireDb()
    // Admin-only by RLS: a learner rating themselves would make the framework
    // meaningless, and the policy refuses it.
    const res = await db.from('user_competencies').upsert(
      { user_id: userId, competency_id: competencyId, level, note, assessed_by: null },
      { onConflict: 'user_id,competency_id' },
    )
    if (res.error) throw new Error(res.error.message)
  },

  /* --------------------------------------------------------- sales bible -- */

  async salesBible(): Promise<SalesBibleSection[]> {
    const db = requireDb()

    const rows = unwrap(
      await db
        .from('sales_bible_sections')
        .select('*, sales_bible_entries ( * )')
        .order('sort_order'),
    ) as unknown as (Record<string, unknown> & {
      sales_bible_entries?: Record<string, unknown>[]
    })[]

    return rows.map((s) => ({
      id: String(s.id),
      slug: String(s.slug),
      title: String(s.title),
      summary: String(s.summary ?? ''),
      entries: [...(s.sales_bible_entries ?? [])]
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        .map<SalesBibleEntry>((e) => ({
          id: String(e.id),
          label: String(e.label),
          // Preserved as null rather than coerced to '' - the distinction is
          // what drives the "Admin content required" state.
          value: e.value === null || e.value === undefined ? null : String(e.value),
          detail: String(e.detail ?? ''),
          verified: Boolean(e.verified),
          requiresApproval: Boolean(e.requires_approval),
        })),
    }))
  },

  async saveBibleEntry(
    id: string,
    patch: { value?: string | null; detail?: string; verified?: boolean },
  ): Promise<void> {
    const db = requireDb()
    const res = await db
      .from('sales_bible_entries')
      .update({
        // An empty string is treated as clearing the value, so a field cannot
        // be left holding whitespace that reads as configured.
        value: patch.value?.trim() ? patch.value.trim() : null,
        detail: patch.detail,
        verified: patch.verified,
      })
      .eq('id', id)
    if (res.error) throw new Error(res.error.message)

    await logActivity('sales_bible.updated', 'sales_bible_entry', id, patch.value ?? '(cleared)')
  },

  /* ------------------------------------------------------- announcements -- */

  async announcements(includeUnpublished = false): Promise<Announcement[]> {
    const db = requireDb()

    let q = db.from('announcements').select('*').order('published_at', { ascending: false })
    // RLS already hides drafts from a learner; this narrows an admin's view.
    if (!includeUnpublished) q = q.eq('status', 'published')

    return unwrap(await q).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      priority: r.priority,
      audience: r.audience,
      status: r.status,
      publishedAt: r.published_at,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    }))
  },

  async saveAnnouncement(input: Partial<Announcement> & { id?: string }): Promise<void> {
    const db = requireDb()

    const payload = {
      title: input.title ?? 'Untitled',
      content: input.content ?? '',
      priority: input.priority ?? 'normal',
      audience: input.audience ?? (['admin', 'sales'] as const),
      status: input.status ?? 'draft',
      published_at:
        input.status === 'published' ? (input.publishedAt ?? new Date().toISOString()) : null,
      expires_at: input.expiresAt,
    }

    const res = input.id
      ? await db.from('announcements').update(payload).eq('id', input.id)
      : await db.from('announcements').insert(payload)
    if (res.error) throw new Error(res.error.message)

    await logActivity(
      input.id ? 'announcement.updated' : 'announcement.created',
      'announcement',
      input.id ?? null,
      payload.title,
    )
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const db = requireDb()
    const res = await db.from('announcements').delete().eq('id', id)
    if (res.error) throw new Error(res.error.message)
  },
}

function slugify(v: string): string {
  return (
    v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'
  )
}
