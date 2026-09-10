/**
 * The competency framework (§31, §32).
 *
 * The competency NAMES and the 1-5 scale LABELS are both specified in the
 * project brief, so they are seeded verbatim.
 *
 * The definitions and behavioural indicators are NOT. The brief says to
 * "preserve the definitions and behavioral indicators from the source
 * documents", and those documents were not supplied - so `definition` is left
 * empty and `indicators` empty rather than filled with plausible HR prose.
 * The competency admin screen shows these as needing content, which is the
 * honest state and the thing that prompts someone to supply the real text.
 */

export interface SeedCompetency {
  slug: string
  name: string
  /** Empty until the source dictionary is supplied. Never invented. */
  definition: string
  cluster: 'core' | 'sales' | 'chat' | 'service'
  indicators: string[]
}

export const COMPETENCIES: SeedCompetency[] = [
  { slug: 'customer-focus', name: 'Customer Focus', definition: '', cluster: 'core', indicators: [] },
  { slug: 'communication-skills', name: 'Communication Skills', definition: '', cluster: 'core', indicators: [] },
  { slug: 'active-listening', name: 'Active Listening', definition: '', cluster: 'core', indicators: [] },
  { slug: 'product-knowledge', name: 'Product Knowledge', definition: '', cluster: 'core', indicators: [] },
  { slug: 'professionalism', name: 'Professionalism', definition: '', cluster: 'core', indicators: [] },

  { slug: 'sales-ability', name: 'Sales Ability', definition: '', cluster: 'sales', indicators: [] },
  { slug: 'needs-analysis', name: 'Needs Analysis', definition: '', cluster: 'sales', indicators: [] },
  { slug: 'persuasion-influencing', name: 'Persuasion & Influencing', definition: '', cluster: 'sales', indicators: [] },
  { slug: 'objection-handling', name: 'Objection Handling', definition: '', cluster: 'sales', indicators: [] },
  { slug: 'closing-skills', name: 'Closing Skills', definition: '', cluster: 'sales', indicators: [] },
  { slug: 'follow-up-management', name: 'Follow-Up Management', definition: '', cluster: 'sales', indicators: [] },

  { slug: 'chat-etiquette', name: 'Chat Etiquette', definition: '', cluster: 'chat', indicators: [] },
  { slug: 'chat-conversion', name: 'Chat Conversion', definition: '', cluster: 'chat', indicators: [] },
  {
    slug: 'multitasking-response-management',
    name: 'Multitasking & Response Management',
    definition: '',
    cluster: 'chat',
    indicators: [],
  },
]

/**
 * The 1-5 rating scale, quoted directly from the brief (§31). These labels are
 * source material, so they are seeded as given.
 */
export const COMPETENCY_LEVELS = [
  { level: 1, label: 'Needs Significant Improvement', description: '' },
  { level: 2, label: 'Developing', description: '' },
  { level: 3, label: 'Competent', description: '' },
  { level: 4, label: 'Proficient', description: '' },
  { level: 5, label: 'Exceptional', description: '' },
] as const
