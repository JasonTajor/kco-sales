/**
 * Sales resource domain types.
 *
 * Separate from `src/types/index.ts` because these describe the reference
 * libraries (§22, §24, §25, §32, §35, §45) rather than the learning content
 * model, and nothing in the learning model depends on them.
 */

export interface Script {
  id: string
  slug: string
  title: string
  kind: 'phone' | 'chat' | 'closing' | 'qualification' | 'follow-up' | 'complaint' | 'wording'
  channel: 'phone' | 'chat' | 'both'
  situation: string
  language: 'en' | 'fil' | 'mixed'
  lines: string[]
  notes: string
  tags: string[]
}

export const SCRIPT_KINDS = [
  { value: 'phone', label: 'Phone' },
  { value: 'chat', label: 'Chat' },
  { value: 'closing', label: 'Closing' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'complaint', label: 'Complaint handling' },
  { value: 'wording', label: 'Professional wording' },
] as const

export interface Competency {
  id: string
  slug: string
  name: string
  /** Empty when the source competency dictionary has not been supplied (§32). */
  definition: string
  cluster: 'core' | 'sales' | 'chat' | 'service'
  behavioralIndicators: string[]
}

export interface CompetencyLevel {
  level: number
  label: string
  description: string
}

export interface UserCompetency {
  competencyId: string
  level: number
  note: string
  assessedAt: string
  assessedBy: string | null
}

/* ------------------------------------------------------------ sales bible -- */

export interface SalesBibleEntry {
  id: string
  label: string
  /**
   * Null means no verified value has been supplied.
   *
   * This is the distinction the whole Sales Bible turns on (§78): a null
   * renders as "Admin content required", never as a blank line and never as a
   * plausible-looking placeholder. An agent must be able to tell the
   * difference between a price and the absence of one.
   */
  value: string | null
  detail: string
  verified: boolean
  /** A business-performance claim needing management sign-off (§44). */
  requiresApproval: boolean
}

export interface SalesBibleSection {
  id: string
  slug: string
  title: string
  summary: string
  entries: SalesBibleEntry[]
}

/* ---------------------------------------------------------- announcements -- */

export interface Announcement {
  id: string
  title: string
  content: string
  priority: 'normal' | 'important' | 'critical'
  audience: ('admin' | 'sales')[]
  status: 'draft' | 'published' | 'archived'
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
}
