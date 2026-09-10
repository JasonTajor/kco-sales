/**
 * Modules and Sales Bible slots from the §43/§45 outline whose source
 * documents were not supplied.
 *
 * These exist so the information architecture is complete and an admin can see
 * exactly what is missing - not to pad the library. Every one is created as a
 * DRAFT, so no learner ever opens an empty module, and each carries a callout
 * naming the document that is needed.
 *
 * §78 is the rule being followed here: where a document refers to information
 * it does not provide, show that it is not configured. Do not invent a price,
 * a flavour list, or a policy.
 */

export interface StubModule {
  slug: string
  title: string
  description: string
  categorySlug: string
  moduleNumber: number
  /** Names the specific source needed, so the gap is actionable. */
  awaiting: string
}

export const STUB_MODULES: StubModule[] = [
  {
    slug: 'office-rules-and-sales-reporting',
    title: 'Office Rules & Sales Reporting Guidelines',
    description:
      'Attendance, punctuality, working hours, workstation discipline, and the daily sales reporting requirement.',
    categorySlug: 'sales-process',
    moduleNumber: 20,
    awaiting:
      'This module needs the Office Rules & Sales Reporting Guidelines document. Company policies - working hours, attendance rules, reporting deadlines - must be entered exactly as management issued them, so nothing has been drafted here.',
  },
  {
    slug: 'customer-communication-rules',
    title: 'Customer Communication & Chat Rules',
    description:
      'Response-time standards, follow-up rules, escalation, and the boundaries of what an agent may commit to.',
    categorySlug: 'chat-support',
    moduleNumber: 21,
    awaiting:
      'Chat Etiquette and The KCO Chat Formula already cover technique. This module needs the company communication policy document for the rules themselves - response windows, follow-up cadence, and what requires a supervisor.',
  },
  {
    slug: 'product-mastery',
    title: 'Product Mastery',
    description:
      'Flavours, sizes, shelf life, certifications, and the brand story behind Kangkong Chips Original.',
    categorySlug: 'quick-reference',
    moduleNumber: 22,
    awaiting:
      'Requires verified product data: the flavour range, pack sizes, shelf life, and any certifications. Product facts must come from management - an agent quoting an invented specification to a customer is a real problem, so this module stays empty until the data is supplied.',
  },
  {
    slug: 'qualification-and-needs-analysis',
    title: 'Qualification & Needs Analysis',
    description: 'Qualifying a lead and uncovering the need before presenting anything.',
    categorySlug: 'sales-process',
    moduleNumber: 23,
    awaiting:
      'Sales Call Structure covers the Discover step and Quick Reference holds the qualification questions. This module needs the dedicated qualification framework document to stand on its own.',
  },
  {
    slug: 'closing-skills',
    title: 'Closing Skills',
    description: 'Closing techniques, trial closes, and asking for the order without pressure.',
    categorySlug: 'sales-process',
    moduleNumber: 24,
    awaiting:
      'Closing scripts are available in Quick Reference and inside Sales Call Structure. The full closing-techniques document is needed to build this out as a module.',
  },
  {
    slug: 'follow-up-management',
    title: 'Follow-Up Management',
    description: 'Follow-up timing, the seen-zone problem, and keeping a pipeline warm.',
    categorySlug: 'sales-process',
    moduleNumber: 25,
    awaiting:
      'Needs the follow-up rules document: how soon, how often, and when to stop. These are operational policies rather than technique, so they must come from management.',
  },
  {
    slug: 'sales-performance-and-scorecard',
    title: 'Sales Performance & Scorecard',
    description:
      'The Weekly Sales Scorecard, the metrics it tracks, and how performance is reviewed.',
    categorySlug: 'quick-reference',
    moduleNumber: 26,
    awaiting:
      'Needs the Weekly Sales Scorecard definition and its metric list. The brief is explicit that performance is not judged on chat volume alone, so the real scorecard must be supplied rather than approximated.',
  },
]

/* ---------------------------------------------------------------------------
   Sales Bible (§45).

   The four sections come from the brief. Their entries are the fields the
   brief names - and every value is `undefined`, because not one verified
   figure was supplied. `undefined` becomes a NULL in the database, which is
   what the Sales Bible page reads to render "Admin content required" rather
   than a blank or, worse, a made-up number (§78).
--------------------------------------------------------------------------- */

export interface BibleEntry {
  label: string
  /** Left undefined until management supplies a verified value. */
  value?: string
  detail?: string
  /** Business-performance claims that need sign-off before use (§44). */
  requiresApproval?: boolean
}

export interface BibleSection {
  slug: string
  title: string
  summary: string
  entries: BibleEntry[]
}

export const SALES_BIBLE: BibleSection[] = [
  {
    slug: 'product',
    title: 'Product',
    summary: 'What the product is. Every field here must be verified before an agent quotes it.',
    entries: [
      { label: 'Product name', detail: 'Full product name as it appears on packaging.' },
      { label: 'Available flavours', detail: 'The complete flavour range currently in production.' },
      { label: 'Pack sizes', detail: 'Every size offered, with net weight.' },
      { label: 'Shelf life', detail: 'From manufacture date, and the storage conditions it assumes.' },
      { label: 'Certifications', detail: 'FDA, LTO, halal or other certifications actually held.' },
      { label: 'Brand story', detail: 'The approved short version an agent may tell a customer.' },
      { label: 'Ingredients', detail: 'For allergen questions.' },
    ],
  },
  {
    slug: 'negosyo',
    title: 'Negosyo',
    summary:
      'Reseller packages and pricing. Nothing in this section may be quoted to a customer until it is marked verified.',
    entries: [
      { label: 'Package inclusions', detail: 'Exactly what a reseller package contains.' },
      { label: 'Package price', detail: 'The price management has approved for quoting.' },
      { label: 'Reseller price per pack', detail: 'Wholesale price at each tier, if tiers exist.' },
      { label: 'Suggested retail price', detail: 'SRP as approved - not a figure an agent estimates.' },
      { label: 'Minimum order', detail: 'Minimum quantity or value for a reseller order.' },
      {
        label: 'Sample profit computation',
        detail:
          'An illustrative computation only. Must be labelled potential gross profit, never guaranteed income (§46).',
        requiresApproval: true,
      },
    ],
  },
  {
    slug: 'sales',
    title: 'Sales',
    summary:
      'The conversation itself. These are populated from the training modules already in the library.',
    entries: [
      { label: 'Opening script', detail: 'See Quick Reference - Phone Opening and Chat Opening.' },
      { label: 'Qualification questions', detail: 'See Quick Reference - Qualification Questions.' },
      { label: 'Pitch', detail: 'Needs the approved product pitch, which depends on verified product data.' },
      { label: 'Objection handling', detail: 'See the Objection Handling library - 12 objections with A.C.A.C. responses.' },
      { label: 'Closing scripts', detail: 'See Quick Reference - Closing Scripts.' },
    ],
  },
  {
    slug: 'faq',
    title: 'FAQ',
    summary: 'The questions customers ask most. Answers must match actual company policy.',
    entries: [
      { label: 'Delivery', detail: 'Areas covered, lead times, and who shoulders the cost.' },
      { label: 'Payment', detail: 'Accepted methods, and whether COD is available.' },
      { label: 'Minimum order', detail: 'For retail customers as distinct from resellers.' },
      { label: 'Reordering', detail: 'How an existing reseller places a repeat order.' },
      { label: 'Reselling', detail: 'Territory rules and any exclusivity arrangements.' },
      { label: 'Marketing support', detail: 'What materials or support a reseller actually receives.' },
    ],
  },
]
