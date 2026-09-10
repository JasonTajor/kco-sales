import type {
  Announcement,
  Competency,
  CompetencyLevel,
  SalesBibleEntry,
  SalesBibleSection,
  Script,
  UserCompetency,
} from '@/types/resources'
import type { ContentBlock, Objection, QuickReferenceCard, WordingPair } from '@/types'
import { delay } from '@/lib/delay'
import { uid } from '@/lib/id'
import { objections as seedObjections } from '@/data/objections'
import { quickReferenceCards } from '@/data/quickReference'
import { wordingPairs } from '@/data/wording'
import { materials } from '@/data/materials'
import { persist } from '../store'

/**
 * The resource libraries, offline.
 *
 * Scripts are derived the same way the seed generator derives them - by walking
 * the `script` blocks inside the transcribed modules and quick-reference cards -
 * so the offline library shows exactly the rows the database would hold rather
 * than a separate hand-written set that could disagree with it.
 *
 * The Sales Bible and the competency framework are the structural definitions
 * from `supabase/seed`, with every value null. That is not a placeholder: no
 * verified product or pricing data was supplied, and inventing one here would
 * be the specific failure §78 rules out.
 */

/* ------------------------------------------------------------- scripts ---- */

function deriveScripts(): Script[] {
  const out: Script[] = []
  const seen = new Set<string>()

  const classify = (label: string, context: string): Pick<Script, 'kind' | 'channel'> => {
    const h = `${label} ${context}`.toLowerCase()
    if (/complaint|angry|damaged|refund|escalat/.test(h)) return { kind: 'complaint', channel: 'both' }
    if (/clos|order|confirm|reserve/.test(h)) return { kind: 'closing', channel: 'both' }
    if (/follow.?up|seen|reply|balik/.test(h)) return { kind: 'follow-up', channel: 'both' }
    if (/qualif|discover|question|need/.test(h)) return { kind: 'qualification', channel: 'both' }
    if (/chat|messenger|message/.test(h)) return { kind: 'chat', channel: 'chat' }
    if (/phone|call|hold|ring/.test(h)) return { kind: 'phone', channel: 'phone' }
    return { kind: 'phone', channel: 'both' }
  }

  const add = (
    labelRaw: string,
    context: string,
    language: Script['language'],
    lines: string[],
    source: string,
    tags: string[],
  ) => {
    const title = labelRaw.trim() || 'Script'
    const base = `${context}-${title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
    let slug = base
    let n = 2
    while (seen.has(slug)) slug = `${base}-${n++}`
    seen.add(slug)

    out.push({
      id: `script-${slug}`,
      slug,
      title,
      ...classify(title, context),
      situation: context,
      language,
      lines,
      notes: `Source: ${source}`,
      tags,
    })
  }

  materials.forEach((m) =>
    m.sections.forEach((s) =>
      s.blocks.forEach((b) => {
        if (b.type !== 'script') return
        add(b.label ?? s.title, s.title, b.language, b.lines, `${m.title} - ${s.title}`, m.tags)
      }),
    ),
  )

  quickReferenceCards.forEach((c) =>
    c.blocks.forEach((b: ContentBlock) => {
      if (b.type !== 'script') return
      add(b.label ?? c.title, c.title, b.language, b.lines, `Quick Reference - ${c.title}`, [c.kind])
    }),
  )

  return out
}

/* ---------------------------------------------------------- local state --- */

const LS = 'kco.resources'

interface LocalState {
  scripts: Script[]
  objections: Objection[]
  bible: SalesBibleSection[]
  announcements: Announcement[]
  userCompetencies: Record<string, UserCompetency[]>
}

function load(): LocalState {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) return JSON.parse(raw) as LocalState
  } catch {
    /* fall through to the seeded baseline */
  }
  return {
    scripts: deriveScripts(),
    objections: JSON.parse(JSON.stringify(seedObjections)) as Objection[],
    bible: buildBible(),
    announcements: [],
    userCompetencies: {},
  }
}

const state = load()
const save = () => persist('resources', state)

/* ------------------------------------------------------- structural seeds -- */

/**
 * The Sales Bible structure, with no values.
 *
 * Mirrors `supabase/seed/stubs.ts`. Kept in sync by hand rather than imported,
 * because the seed module is a build-time script that pulls in Node-only
 * concerns and must not end up in the browser bundle.
 */
function buildBible(): SalesBibleSection[] {
  const section = (
    slug: string,
    title: string,
    summary: string,
    labels: [string, string, boolean?][],
  ): SalesBibleSection => ({
    id: `bible-${slug}`,
    slug,
    title,
    summary,
    entries: labels.map<SalesBibleEntry>(([label, detail, approval]) => ({
      id: `bible-${slug}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label,
      value: null,
      detail,
      verified: false,
      requiresApproval: Boolean(approval),
    })),
  })

  return [
    section('product', 'Product', 'What the product is. Every field must be verified before an agent quotes it.', [
      ['Product name', 'Full product name as it appears on packaging.'],
      ['Available flavours', 'The complete flavour range currently in production.'],
      ['Pack sizes', 'Every size offered, with net weight.'],
      ['Shelf life', 'From manufacture date, and the storage conditions it assumes.'],
      ['Certifications', 'FDA, LTO, halal or other certifications actually held.'],
      ['Brand story', 'The approved short version an agent may tell a customer.'],
      ['Ingredients', 'For allergen questions.'],
    ]),
    section('negosyo', 'Negosyo', 'Reseller packages and pricing. Nothing here may be quoted until it is marked verified.', [
      ['Package inclusions', 'Exactly what a reseller package contains.'],
      ['Package price', 'The price management has approved for quoting.'],
      ['Reseller price per pack', 'Wholesale price at each tier, if tiers exist.'],
      ['Suggested retail price', 'SRP as approved - not a figure an agent estimates.'],
      ['Minimum order', 'Minimum quantity or value for a reseller order.'],
      ['Sample profit computation', 'Illustrative only. Label as potential gross profit, never guaranteed income.', true],
    ]),
    section('sales', 'Sales', 'The conversation itself, drawn from the training modules already in the library.', [
      ['Opening script', 'See Quick Reference - Phone Opening and Chat Opening.'],
      ['Qualification questions', 'See Quick Reference - Qualification Questions.'],
      ['Pitch', 'Needs the approved product pitch, which depends on verified product data.'],
      ['Objection handling', 'See the Objection Handling library.'],
      ['Closing scripts', 'See Quick Reference - Closing Scripts.'],
    ]),
    section('faq', 'FAQ', 'The questions customers ask most. Answers must match actual company policy.', [
      ['Delivery', 'Areas covered, lead times, and who shoulders the cost.'],
      ['Payment', 'Accepted methods, and whether COD is available.'],
      ['Minimum order', 'For retail customers as distinct from resellers.'],
      ['Reordering', 'How an existing reseller places a repeat order.'],
      ['Reselling', 'Territory rules and any exclusivity arrangements.'],
      ['Marketing support', 'What materials or support a reseller actually receives.'],
    ]),
  ]
}

/** Names and scale from the brief; definitions deliberately absent (§32). */
const COMPETENCIES: Competency[] = [
  ['customer-focus', 'Customer Focus', 'core'],
  ['communication-skills', 'Communication Skills', 'core'],
  ['active-listening', 'Active Listening', 'core'],
  ['product-knowledge', 'Product Knowledge', 'core'],
  ['professionalism', 'Professionalism', 'core'],
  ['sales-ability', 'Sales Ability', 'sales'],
  ['needs-analysis', 'Needs Analysis', 'sales'],
  ['persuasion-influencing', 'Persuasion & Influencing', 'sales'],
  ['objection-handling', 'Objection Handling', 'sales'],
  ['closing-skills', 'Closing Skills', 'sales'],
  ['follow-up-management', 'Follow-Up Management', 'sales'],
  ['chat-etiquette', 'Chat Etiquette', 'chat'],
  ['chat-conversion', 'Chat Conversion', 'chat'],
  ['multitasking-response-management', 'Multitasking & Response Management', 'chat'],
].map(([slug, name, cluster]) => ({
  id: `competency-${slug}`,
  slug: slug!,
  name: name!,
  definition: '',
  cluster: cluster as Competency['cluster'],
  behavioralIndicators: [],
}))

const COMPETENCY_LEVELS: CompetencyLevel[] = [
  { level: 1, label: 'Needs Significant Improvement', description: '' },
  { level: 2, label: 'Developing', description: '' },
  { level: 3, label: 'Competent', description: '' },
  { level: 4, label: 'Proficient', description: '' },
  { level: 5, label: 'Exceptional', description: '' },
]

/* ------------------------------------------------------------ the service -- */

export const resourceService = {
  async scripts(filters: { kind?: string; search?: string } = {}): Promise<Script[]> {
    const q = filters.search?.trim().toLowerCase() ?? ''
    return delay(
      state.scripts.filter((s) => {
        if (filters.kind && filters.kind !== 'all' && s.kind !== filters.kind) return false
        if (!q) return true
        return (
          s.title.toLowerCase().includes(q) ||
          s.situation.toLowerCase().includes(q) ||
          s.lines.some((l) => l.toLowerCase().includes(q))
        )
      }),
      120,
    )
  },

  async saveScript(input: Partial<Script> & { id?: string }): Promise<Script> {
    const existing = input.id ? state.scripts.find((s) => s.id === input.id) : undefined
    if (existing) {
      Object.assign(existing, input)
      save()
      return delay(existing, 180)
    }
    const created: Script = {
      id: uid('script'),
      slug: input.slug ?? uid('script'),
      title: input.title ?? 'Untitled script',
      kind: input.kind ?? 'phone',
      channel: input.channel ?? 'both',
      situation: input.situation ?? '',
      language: input.language ?? 'mixed',
      lines: input.lines ?? [],
      notes: input.notes ?? '',
      tags: input.tags ?? [],
    }
    state.scripts.unshift(created)
    save()
    return delay(created, 200)
  },

  async deleteScript(id: string): Promise<void> {
    state.scripts = state.scripts.filter((s) => s.id !== id)
    save()
    return delay(undefined, 140)
  },

  async objections(filters: { category?: string; search?: string } = {}): Promise<Objection[]> {
    const q = filters.search?.trim().toLowerCase() ?? ''
    return delay(
      state.objections.filter((o) => {
        if (filters.category && filters.category !== 'all' && o.category !== filters.category) {
          return false
        }
        if (!q) return true
        return (
          o.objection.toLowerCase().includes(q) ||
          o.translation.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q)
        )
      }),
      120,
    )
  },

  async saveObjection(input: Partial<Objection> & { id?: string }): Promise<Objection> {
    const existing = input.id ? state.objections.find((o) => o.id === input.id) : undefined
    if (existing) {
      Object.assign(existing, input)
      save()
      return delay(existing, 180)
    }
    const created = {
      id: uid('obj'),
      slug: input.slug ?? uid('obj'),
      objection: input.objection ?? '',
      translation: input.translation ?? '',
      category: input.category ?? 'price',
      frequency: input.frequency ?? 'medium',
      acknowledge: input.acknowledge ?? '',
      clarify: input.clarify ?? '',
      address: input.address ?? '',
      close: input.close ?? '',
      pitfalls: input.pitfalls ?? [],
      claimSensitive: input.claimSensitive ?? false,
    } as Objection
    state.objections.unshift(created)
    save()
    return delay(created, 200)
  },

  async quickReference(): Promise<QuickReferenceCard[]> {
    return delay(quickReferenceCards, 100)
  },

  async wording(): Promise<WordingPair[]> {
    return delay(wordingPairs, 100)
  },

  async competencies(): Promise<Competency[]> {
    return delay(COMPETENCIES, 80)
  },

  async competencyLevels(): Promise<CompetencyLevel[]> {
    return delay(COMPETENCY_LEVELS, 60)
  },

  async userCompetencies(userId: string): Promise<UserCompetency[]> {
    return delay(state.userCompetencies[userId] ?? [], 80)
  },

  async rateCompetency(
    userId: string,
    competencyId: string,
    level: number,
    note = '',
  ): Promise<void> {
    const list = state.userCompetencies[userId] ?? []
    const existing = list.find((c) => c.competencyId === competencyId)
    if (existing) {
      existing.level = level
      existing.note = note
      existing.assessedAt = new Date().toISOString()
    } else {
      list.push({
        competencyId,
        level,
        note,
        assessedAt: new Date().toISOString(),
        assessedBy: null,
      })
    }
    state.userCompetencies[userId] = list
    save()
    return delay(undefined, 160)
  },

  async salesBible(): Promise<SalesBibleSection[]> {
    return delay(state.bible, 120)
  },

  async saveBibleEntry(
    id: string,
    patch: { value?: string | null; detail?: string; verified?: boolean },
  ): Promise<void> {
    for (const section of state.bible) {
      const entry = section.entries.find((e) => e.id === id)
      if (!entry) continue
      if (patch.value !== undefined) entry.value = patch.value?.trim() ? patch.value.trim() : null
      if (patch.detail !== undefined) entry.detail = patch.detail
      if (patch.verified !== undefined) entry.verified = patch.verified
      save()
      return delay(undefined, 160)
    }
    throw new Error('That Sales Bible entry does not exist.')
  },

  async announcements(includeUnpublished = false): Promise<Announcement[]> {
    return delay(
      state.announcements.filter((a) => includeUnpublished || a.status === 'published'),
      100,
    )
  },

  async saveAnnouncement(input: Partial<Announcement> & { id?: string }): Promise<void> {
    const existing = input.id ? state.announcements.find((a) => a.id === input.id) : undefined
    if (existing) {
      Object.assign(existing, input)
    } else {
      state.announcements.unshift({
        id: uid('ann'),
        title: input.title ?? 'Untitled',
        content: input.content ?? '',
        priority: input.priority ?? 'normal',
        audience: input.audience ?? ['admin', 'sales'],
        status: input.status ?? 'draft',
        publishedAt: input.status === 'published' ? new Date().toISOString() : null,
        expiresAt: input.expiresAt ?? null,
        createdAt: new Date().toISOString(),
      })
    }
    save()
    return delay(undefined, 180)
  },

  async deleteAnnouncement(id: string): Promise<void> {
    state.announcements = state.announcements.filter((a) => a.id !== id)
    save()
    return delay(undefined, 140)
  },
}
