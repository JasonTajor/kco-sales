import type {
  Category,
  ContentStatus,
  Difficulty,
  LearningPath,
  Material,
  MaterialSection,
  Role,
} from '@/types'
import { delay } from '@/lib/delay'
import { uid } from '@/lib/id'
import { db, logActivity, persistCategories, persistMaterials } from '../store'

export interface MaterialFilters {
  search?: string
  categoryId?: string | 'all'
  difficulty?: Difficulty | 'all'
  status?: ContentStatus | 'all'
  audience?: Role
  tag?: string | 'all'
  /** Learner-facing filter, resolved against the current user's progress. */
  completion?: 'all' | 'not-started' | 'in-progress' | 'completed' | 'favorites'
  userId?: string
  sortBy?: 'updated' | 'title' | 'duration' | 'module'
}

function matches(m: Material, f: MaterialFilters): boolean {
  const q = (f.search ?? '').trim().toLowerCase()
  if (f.categoryId && f.categoryId !== 'all' && m.categoryId !== f.categoryId) return false
  if (f.difficulty && f.difficulty !== 'all' && m.difficulty !== f.difficulty) return false
  if (f.status && f.status !== 'all' && m.status !== f.status) return false
  if (f.tag && f.tag !== 'all' && !m.tags.includes(f.tag)) return false
  if (f.audience && !m.audience.includes(f.audience)) return false
  if (!q) return true
  return (
    m.title.toLowerCase().includes(q) ||
    m.description.toLowerCase().includes(q) ||
    m.tags.some((t) => t.includes(q)) ||
    m.sections.some((s) => s.title.toLowerCase().includes(q))
  )
}

export const materialService = {
  async list(filters: MaterialFilters = {}): Promise<Material[]> {
    let rows = db.materials.filter((m) => matches(m, filters))

    if (filters.completion && filters.completion !== 'all' && filters.userId) {
      rows = rows.filter((m) => {
        const p = db.progress.find((x) => x.userId === filters.userId && x.materialId === m.id)
        if (filters.completion === 'favorites') return Boolean(p?.favorite)
        const state = p?.state ?? 'not-started'
        return state === filters.completion
      })
    }

    const sortBy = filters.sortBy ?? 'module'
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'duration') return a.duration - b.duration
      if (sortBy === 'updated') return b.updatedAt.localeCompare(a.updatedAt)
      return a.moduleNumber - b.moduleNumber
    })

    return delay(rows)
  },

  async get(idOrSlug: string): Promise<Material | null> {
    const m = db.materials.find((x) => x.id === idOrSlug || x.slug === idOrSlug) ?? null
    return delay(m, 180)
  },

  async categories(): Promise<Category[]> {
    return delay(db.categories, 100)
  },

  async createCategory(input: Omit<Category, 'id'>): Promise<Category> {
    const cat: Category = { ...input, id: uid('cat') }
    db.categories.push(cat)
    persistCategories()
    return delay(cat, 200)
  },

  async updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
    const cat = db.categories.find((c) => c.id === id)
    if (!cat) throw new Error('Category not found')
    Object.assign(cat, patch)
    persistCategories()
    return delay(cat, 180)
  },

  async deleteCategory(id: string): Promise<void> {
    const inUse = db.materials.some((m) => m.categoryId === id)
    if (inUse) throw new Error('This category still has materials assigned to it.')
    db.categories = db.categories.filter((c) => c.id !== id)
    persistCategories()
    return delay(undefined, 180)
  },

  async create(input: Partial<Material>, actorId: string): Promise<Material> {
    const now = new Date().toISOString()
    const material: Material = {
      id: uid('mat'),
      slug: (input.title ?? 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      title: input.title ?? 'Untitled material',
      description: input.description ?? '',
      categoryId: input.categoryId ?? db.categories[0]!.id,
      moduleNumber: db.materials.length + 1,
      status: 'draft',
      difficulty: input.difficulty ?? 'foundation',
      duration: input.duration ?? 10,
      audience: input.audience ?? ['sales'],
      teams: input.teams ?? [],
      tags: input.tags ?? [],
      sections: input.sections ?? [
        { id: uid('sec'), index: '01', title: 'Untitled section', blocks: [] },
      ],
      createdAt: now,
      updatedAt: now,
      authorId: actorId,
      version: 1,
    }
    db.materials.unshift(material)
    persistMaterials()
    logActivity({ actorId, action: 'material.created', targetLabel: material.title, targetId: material.id })
    return delay(material, 300)
  },

  async update(id: string, patch: Partial<Material>, actorId: string): Promise<Material> {
    const m = db.materials.find((x) => x.id === id)
    if (!m) throw new Error('Material not found')
    Object.assign(m, patch, { updatedAt: new Date().toISOString(), version: m.version + 1 })
    persistMaterials()
    logActivity({ actorId, action: 'material.updated', targetLabel: m.title, targetId: m.id })
    return delay(m, 260)
  },

  async setStatus(id: string, status: ContentStatus, actorId: string): Promise<Material> {
    const m = db.materials.find((x) => x.id === id)
    if (!m) throw new Error('Material not found')
    m.status = status
    m.updatedAt = new Date().toISOString()
    persistMaterials()
    logActivity({
      actorId,
      action: status === 'published' ? 'material.published' : status === 'archived' ? 'material.archived' : 'material.updated',
      targetLabel: m.title,
      targetId: m.id,
    })
    return delay(m, 220)
  },

  async duplicate(id: string, actorId: string): Promise<Material> {
    const src = db.materials.find((x) => x.id === id)
    if (!src) throw new Error('Material not found')
    const copy: Material = JSON.parse(JSON.stringify(src))
    copy.id = uid('mat')
    copy.slug = `${src.slug}-copy`
    copy.title = `${src.title} (copy)`
    copy.status = 'draft'
    copy.version = 1
    copy.createdAt = new Date().toISOString()
    copy.updatedAt = copy.createdAt
    db.materials.unshift(copy)
    persistMaterials()
    logActivity({ actorId, action: 'material.created', targetLabel: copy.title, targetId: copy.id })
    return delay(copy, 280)
  },

  async saveSections(id: string, sections: MaterialSection[], actorId: string): Promise<Material> {
    return this.update(id, { sections }, actorId)
  },

  /**
   * Learning paths (§26).
   *
   * Lives on the material service rather than its own because a path is a
   * list of materials - every consumer that wants one also wants them.
   */
  async paths(): Promise<LearningPath[]> {
    return delay(db.paths, 100)
  },

  async path(idOrSlug: string): Promise<LearningPath | null> {
    return delay(db.paths.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null, 120)
  },

  /** Distinct tags across the library, for the filter menus. */
  async tags(): Promise<string[]> {
    const set = new Set<string>()
    db.materials.forEach((m) => m.tags.forEach((t) => set.add(t)))
    return delay([...set].sort(), 80)
  },
}
