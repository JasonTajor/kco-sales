import type { LearningPath } from '@/types'

export const learningPaths: LearningPath[] = [
  {
    id: 'path-new-hire',
    slug: 'new-hire-foundation',
    title: 'New Hire Foundation',
    description:
      'The first week. Everything a new KCO agent needs before taking a live call or chat on their own.',
    audience: ['sales'],
    materialIds: [
      'mat-phone-etiquette',
      'mat-chat-etiquette',
      'mat-sales-call-structure',
      'mat-professional-wording',
    ],
    estimatedMinutes: 125,
    status: 'published',
    accent: 'green',
  },
  {
    id: 'path-chat-specialist',
    slug: 'chat-support-specialist',
    title: 'Chat Support Specialist',
    description:
      'For agents working the Messenger queue full time - etiquette, the G.A.L.P.H.C.F.R. formula, and written objection handling.',
    audience: ['sales'],
    materialIds: ['mat-chat-etiquette', 'mat-chat-formula', 'mat-objection-handling', 'mat-professional-wording'],
    estimatedMinutes: 130,
    status: 'published',
    accent: 'blue',
  },
  {
    id: 'path-closer',
    slug: 'closing-and-objections',
    title: 'Closing & Objections',
    description:
      'For agents who open well but stall at the close. Structure, A.C.A.C., and the twelve objection cards.',
    audience: ['sales'],
    materialIds: ['mat-sales-call-structure', 'mat-objection-handling', 'mat-delivery-policies'],
    estimatedMinutes: 87,
    status: 'published',
    accent: 'amber',
  },
  {
    id: 'path-facilitator',
    slug: 'facilitator-track',
    title: 'Facilitator Track',
    description:
      'For team leads running huddles: how to pick, run, and debrief the eight training activities.',
    audience: ['admin'],
    materialIds: ['mat-training-activities', 'mat-objection-handling', 'mat-phone-etiquette'],
    estimatedMinutes: 110,
    status: 'published',
    accent: 'rose',
  },
]

export const pathById = (id: string) => learningPaths.find((p) => p.id === id)
export const pathBySlug = (slug: string) => learningPaths.find((p) => p.slug === slug)
