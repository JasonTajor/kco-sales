import type { MaterialSection, WordingPair } from '@/types'
import { wordingPairs } from '@/data/wording'

const byTag = (...tags: string[]): WordingPair['id'][] =>
  wordingPairs.filter((p) => p.tags.some((t) => tags.includes(t))).map((p) => p.id)

const pairsFor = (ids: string[]) =>
  wordingPairs
    .filter((p) => ids.includes(p.id))
    .map((p) => ({ avoid: p.avoid, use: p.use, note: p.note }))

/** Module 7 - Professional Wording, grouped by the moment you need it. */
export const professionalWordingSections: MaterialSection[] = [
  {
    id: 'm7-s01',
    index: '01',
    title: 'Why Wording Matters',
    summary: 'The same message, received completely differently.',
    blocks: [
      {
        id: 'm7-s01-b1',
        type: 'text',
        text: 'Casual phrasing is not rude between friends. On a sales call it makes the company sound improvised, and improvised companies do not get orders worth ten thousand pesos from strangers. Every swap below carries identical information - only the delivery changes.',
      },
      {
        id: 'm7-s01-b2',
        type: 'callout',
        variant: 'info',
        title: 'Searchable from anywhere',
        text: 'This library is available in Quick Reference and from both the Phone and Chat script pages. Press ⌘K and type a phrase to find the professional version mid-call.',
      },
    ],
  },
  {
    id: 'm7-s02',
    index: '02',
    title: 'Buying Time and Clarifying',
    summary: 'Hold, repeat, clarify, verify.',
    blocks: [
      {
        id: 'm7-s02-b1',
        type: 'wording',
        pairs: pairsFor(byTag('hold', 'clarify', 'accuracy')),
      },
    ],
  },
  {
    id: 'm7-s03',
    index: '03',
    title: 'Saying No Without Losing the Customer',
    summary: 'Every no needs an alternative attached.',
    blocks: [
      {
        id: 'm7-s03-b1',
        type: 'wording',
        pairs: pairsFor(byTag('boundaries', 'stock', 'escalation')),
      },
      {
        id: 'm7-s03-b2',
        type: 'callout',
        variant: 'warning',
        title: 'The pattern',
        text: 'State what you cannot do in one short clause, then immediately say what you can do. A bare no invites the customer to argue; a no plus an alternative invites them to choose.',
      },
    ],
  },
  {
    id: 'm7-s04',
    index: '04',
    title: 'Conflict, Complaints, and Blame',
    summary: 'Stay factual, never assign fault.',
    blocks: [
      {
        id: 'm7-s04-b1',
        type: 'wording',
        pairs: pairsFor(byTag('conflict', 'complaints')),
      },
    ],
  },
  {
    id: 'm7-s05',
    index: '05',
    title: 'Price, Closing, and Callbacks',
    summary: 'Where imprecise words cost money.',
    blocks: [
      {
        id: 'm7-s05-b1',
        type: 'wording',
        pairs: pairsFor(byTag('price', 'closing', 'callback', 'discovery')),
      },
    ],
  },
  {
    id: 'm7-s06',
    index: '06',
    title: 'Claims You Must Never Make',
    summary: 'Earnings, guarantees, and false urgency.',
    blocks: [
      {
        id: 'm7-s06-b1',
        type: 'callout',
        variant: 'danger',
        title: 'These are compliance rules, not style preferences',
        text: 'Guaranteed earnings, guaranteed payback periods, and invented scarcity are prohibited on every channel. If you are unsure whether a claim is approved, do not make it - escalate to Admin.',
      },
      { id: 'm7-s06-b2', type: 'wording', pairs: pairsFor(byTag('claims')) },
    ],
  },
  {
    id: 'm7-s07',
    index: '07',
    title: 'Chat Tone and Handovers',
    summary: 'Written words last longer than spoken ones.',
    blocks: [
      {
        id: 'm7-s07-b1',
        type: 'wording',
        pairs: pairsFor(byTag('tone', 'handover')),
      },
      {
        id: 'm7-s07-b2',
        type: 'quiz',
        question: 'A customer asks a question you cannot answer without checking. Which reply is correct?',
        options: [
          '"Hindi ko po alam eh."',
          '"Let me verify that for you po - I will come back to you within the hour."',
          '"Siguro po mga 6 months yung shelf life."',
          '"Sa post po nakalagay lahat."',
        ],
        answerIndex: 1,
        explanation:
          'Verify, and attach a time commitment. Guessing creates a promise the company has to honour, and deflecting to a post reads as dismissive.',
      },
    ],
  },
]
