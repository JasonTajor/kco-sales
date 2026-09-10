import type { ContentBlock, MaterialSection } from '@/types'
import { objections } from '@/data/objections'
import { objectionCategoryLabels } from '@/data/objections'

/**
 * Module 5 - Objection Handling.
 * Three teaching sections, then one generated section per objection card so the
 * material and the Sales Resources cards never drift apart.
 */

const intro: MaterialSection[] = [
  {
    id: 'm5-s01',
    index: '01',
    title: 'An Objection Is Not a Rejection',
    summary: 'A customer who objects is still in the conversation.',
    blocks: [
      {
        id: 'm5-s01-b1',
        type: 'text',
        text: 'A rejection ends the call. An objection continues it. When a customer says "mahal naman", they have already imagined buying - they are telling you what stands between them and the order. Treat it as information, not resistance.',
      },
      {
        id: 'm5-s01-b2',
        type: 'comparison',
        caption: 'Read the difference',
        columns: ['Objection - keep going', 'Rejection - close politely'],
        rows: [
          ['Mahal naman.', 'Hindi po ako interesado, salamat.'],
          ['Pag-iisipan ko muna.', 'Please do not contact me again.'],
          ['Baka hindi ko mabenta.', 'Wrong number po.'],
        ],
      },
      {
        id: 'm5-s01-b3',
        type: 'callout',
        variant: 'info',
        title: 'When it is a real no',
        text: 'Thank them, leave the door open in one sentence, and end the call. A graceful exit today is a callable lead next quarter.',
      },
    ],
  },
  {
    id: 'm5-s02',
    index: '02',
    title: 'The A.C.A.C. Formula',
    summary: 'Four moves that work on all twelve objections.',
    blocks: [
      {
        id: 'm5-s02-b1',
        type: 'formula',
        name: 'A.C.A.C.',
        steps: [
          {
            key: 'A',
            label: 'Acknowledge',
            detail: 'Validate the concern in one sentence. You are agreeing that it is reasonable to ask - not agreeing that it ends the deal.',
          },
          {
            key: 'C',
            label: 'Clarify',
            detail: 'Ask one question to find the specific version of the objection. "Mahal" versus budget and "mahal" versus a competitor need different answers.',
          },
          {
            key: 'A',
            label: 'Address',
            detail: 'Answer the specific concern you just uncovered. Two or three sentences, no product dump.',
          },
          {
            key: 'C',
            label: 'Close',
            detail: 'Return to a small, dated next step. Never leave the objection hanging in silence.',
          },
        ],
      },
      {
        id: 'm5-s02-b2',
        type: 'callout',
        variant: 'warning',
        title: 'Clarify is the step people skip',
        text: 'Jumping straight from Acknowledge to Address means you are answering the generic objection instead of theirs. One question changes the entire response.',
      },
      {
        id: 'm5-s02-b3',
        type: 'dosdonts',
        dos: ['Slow down and let them finish', 'Use their own words back', 'Ask one clarifying question'],
        donts: ['Answer before you understand', 'Discount to escape', 'Argue that the concern is wrong'],
      },
    ],
  },
  {
    id: 'm5-s03',
    index: '03',
    title: 'Claims, Earnings, and What You Must Not Promise',
    summary: 'Read this before you answer anything about kita or ROI.',
    blocks: [
      {
        id: 'm5-s03-b1',
        type: 'callout',
        variant: 'danger',
        title: 'Never guarantee a business outcome',
        text: 'You may not promise income, a payback period, or that stock will sell. These depend entirely on the customer’s own price, area, and effort. Any number you use is an illustration built from their assumptions, and must be described that way out loud.',
      },
      {
        id: 'm5-s03-b2',
        type: 'wording',
        pairs: [
          {
            avoid: 'Kikita ka ng ₱20,000 in one month.',
            use: 'Ang kita po ay depende sa selling price niyo - gusto niyo po bang i-compute natin base sa numbers niyo?',
            note: 'Guaranteed figures are prohibited.',
          },
          {
            avoid: 'Sigurado pong mabenta yan sa inyo.',
            use: 'Kaya po mababa ang minimum namin - para ma-test niyo muna ang area niyo.',
          },
          {
            avoid: 'Two weeks lang, balik na ang puhunan.',
            use: 'Hindi po namin kayang mangako ng specific na panahon - depende po ito sa bilis ng benta niyo.',
          },
        ],
      },
      {
        id: 'm5-s03-b3',
        type: 'text',
        text: 'Three cards in this module are flagged as claim-sensitive: "Baka matagal ang ROI", "Baka hindi patok sa lugar namin", and "Magkano ang kita ko?". Those cards carry a visible notice, and any change to their wording goes through Admin review before publishing.',
      },
    ],
  },
]

/** One section per objection, generated so cards stay in sync with the module. */
const cardSections: MaterialSection[] = objections.map((o, i) => {
  const blocks: ContentBlock[] = [
    {
      id: `m5-${o.id}-b0`,
      type: 'text',
      text: `${objectionCategoryLabels[o.category]} objection · heard ${o.frequency.replace('-', ' ')}. In English: "${o.translation}"`,
    },
    {
      id: `m5-${o.id}-b1`,
      type: 'formula',
      name: 'A.C.A.C. response',
      steps: [
        { key: 'A', label: 'Acknowledge', detail: o.acknowledge },
        { key: 'C', label: 'Clarify', detail: o.clarify },
        { key: 'A', label: 'Address', detail: o.address },
        { key: 'C', label: 'Close', detail: o.close },
      ],
    },
    { id: `m5-${o.id}-b2`, type: 'bullets', items: o.pitfalls },
  ]

  if (o.claimSensitive) {
    blocks.splice(1, 0, {
      id: `m5-${o.id}-b-claim`,
      type: 'callout',
      variant: 'danger',
      title: 'Claim-sensitive - illustrative only',
      text: 'This response touches earnings or market performance. Present every figure as the customer’s own example, never as a guaranteed result. Wording changes require Admin review.',
    })
  }

  return {
    id: `m5-${o.id}`,
    index: String(i + 4).padStart(2, '0'),
    title: `"${o.objection}"`,
    summary: o.translation,
    blocks,
  }
})

export const objectionHandlingSections: MaterialSection[] = [...intro, ...cardSections]
