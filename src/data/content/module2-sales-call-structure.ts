import type { MaterialSection } from '@/types'

/**
 * Module 2 - Sales Call Structure.
 * The eight-step call, one section per step, plus the at-a-glance map.
 */
export const salesCallStructureSections: MaterialSection[] = [
  {
    id: 'm2-s01',
    index: '01',
    title: 'The Eight Steps at a Glance',
    summary: 'Memorise the order. Improvise the words.',
    blocks: [
      {
        id: 'm2-s01-b1',
        type: 'text',
        text: 'Every KCO sales call runs the same eight steps in the same order. The order matters more than the wording: presenting before discovering is the single most common reason a call ends in "pag-iisipan ko pa".',
      },
      {
        id: 'm2-s01-b2',
        type: 'formula',
        name: 'The 8-Step Sales Call',
        steps: [
          { key: '1', label: 'Greet', detail: 'Time of day, your name, KCO Kangkong Chips.' },
          { key: '2', label: 'Introduce', detail: 'Confirm who you are speaking with and your role.' },
          { key: '3', label: 'Purpose', detail: 'One sentence on why you are calling, then ask for their time.' },
          { key: '4', label: 'Discover', detail: 'Three to four questions about their selling situation.' },
          { key: '5', label: 'Present', detail: 'Recommend one package, tied to what they just told you.' },
          { key: '6', label: 'Handle Objection', detail: 'Run A.C.A.C. - Acknowledge, Clarify, Address, Close.' },
          { key: '7', label: 'Close', detail: 'Ask for a specific, small, dated commitment.' },
          { key: '8', label: 'Confirm + End', detail: 'Recap the agreement, state next steps, thank them.' },
        ],
      },
      {
        id: 'm2-s01-b3',
        type: 'quote',
        text: "Don't just sound like a salesperson. Sound like a professional who genuinely wants to help.",
        attribution: 'KCO Golden Rule - Sales Calls',
      },
    ],
  },
  {
    id: 'm2-s02',
    index: '02',
    title: 'Step 1 - Greet',
    summary: 'Warm, clear, and identical every time.',
    blocks: [
      {
        id: 'm2-s02-b1',
        type: 'script',
        label: 'Greet',
        language: 'mixed',
        lines: ['Good morning po!', 'This is Jason from KCO Kangkong Chips.'],
      },
      {
        id: 'm2-s02-b2',
        type: 'bullets',
        items: [
          'Match the time of day - getting this wrong signals you are on autopilot.',
          'Smile before the first word (Module 1, Section 02).',
          'Say the company name fully; "KCO" alone means nothing to a new lead.',
        ],
      },
    ],
  },
  {
    id: 'm2-s03',
    index: '03',
    title: 'Step 2 - Introduce',
    summary: 'Confirm the person, then place yourself.',
    blocks: [
      {
        id: 'm2-s03-b1',
        type: 'script',
        label: 'Introduce',
        language: 'mixed',
        lines: [
          'Am I speaking with Ms. Rivera?',
          'I am part of the KCO reseller support team.',
        ],
      },
      {
        id: 'm2-s03-b2',
        type: 'callout',
        variant: 'warning',
        title: 'Wrong person?',
        text: 'If it is not them, do not pitch. Ask when the right person is available, thank whoever answered, and log the callback. Pitching to the wrong person wastes the lead.',
      },
    ],
  },
  {
    id: 'm2-s04',
    index: '04',
    title: 'Step 3 - Purpose',
    summary: 'Say why you called, then ask permission for the time.',
    blocks: [
      {
        id: 'm2-s04-b1',
        type: 'script',
        label: 'Purpose',
        language: 'mixed',
        lines: [
          'I am following up on your inquiry about becoming a KCO reseller.',
          'Do you have about two minutes so I can walk you through it?',
        ],
      },
      {
        id: 'm2-s04-b2',
        type: 'dosdonts',
        dos: ['Reference their own inquiry', 'Give a real time estimate', 'Accept a "not now" gracefully'],
        donts: [
          'Open with a price',
          'Say "quick question" and then pitch for ten minutes',
          'Skip permission and keep talking',
        ],
      },
    ],
  },
  {
    id: 'm2-s05',
    index: '05',
    title: 'Step 4 - Discover',
    summary: 'The step that makes every later step easier.',
    blocks: [
      {
        id: 'm2-s05-b1',
        type: 'text',
        text: 'Discovery is where you earn the right to recommend. Four questions give you the package, the pitch angle, and an early read on which objection is coming.',
      },
      {
        id: 'm2-s05-b2',
        type: 'numbered',
        items: [
          'Are you planning to sell online, in a store, or both?',
          'Have you resold food products before?',
          'How many customers do you usually reach in a week?',
          'What interested you in Kangkong Chips?',
        ],
      },
      {
        id: 'm2-s05-b3',
        type: 'comparison',
        caption: 'Listen for the signal, pick the angle',
        columns: ['What they say', 'What you lead with'],
        rows: [
          ['"Online lang, sa Facebook."', 'Shareable content, no store rent, small starting pack.'],
          ['"May sari-sari store kami."', 'Shelf visibility, repeat walk-in buyers, display support.'],
          ['"First time ko magtinda."', 'Starter pack, step-by-step onboarding, low first commitment.'],
          ['"Nagtinda na ako ng chips before."', 'Margins, resupply speed, product differentiation.'],
        ],
      },
      {
        id: 'm2-s05-b4',
        type: 'callout',
        variant: 'info',
        title: 'Write it down',
        text: 'Note their answers in the lead record while they talk. You will reuse their exact words in Step 5, and quoting a customer back to themselves is the most persuasive thing you can do.',
      },
    ],
  },
  {
    id: 'm2-s06',
    index: '06',
    title: 'Step 5 - Present',
    summary: 'One recommendation, connected to what they told you.',
    blocks: [
      {
        id: 'm2-s06-b1',
        type: 'text',
        text: 'Do not read the catalogue. Recommend a single package and justify it with their own situation. Three options create hesitation; one clear recommendation creates a decision.',
      },
      {
        id: 'm2-s06-b2',
        type: 'script',
        label: 'Present - tied to discovery',
        language: 'mixed',
        lines: [
          'Based on what you said - online selling and first time as a reseller - ',
          'the starter pack fits you best.',
          'It is the smallest order we do, so your first commitment stays low,',
          'and it gives you enough stock to test which flavour moves fastest.',
          'We also send you the product photos and captions you can post right away.',
        ],
      },
      {
        id: 'm2-s06-b3',
        type: 'callout',
        variant: 'warning',
        title: 'Illustrative only - pending Admin review',
        text: 'Any income, ROI, or "kita" figure you mention must be presented as a training example, never as a guaranteed outcome. Use "some resellers report" framing, and never invent a number.',
      },
    ],
  },
  {
    id: 'm2-s07',
    index: '07',
    title: 'Step 6 - Handle Objection',
    summary: 'A.C.A.C. - the same four moves for every objection.',
    blocks: [
      {
        id: 'm2-s07-b1',
        type: 'formula',
        name: 'A.C.A.C.',
        steps: [
          { key: 'A', label: 'Acknowledge', detail: 'Validate the concern without agreeing that it kills the deal.' },
          { key: 'C', label: 'Clarify', detail: 'Ask one question to find what is actually behind it.' },
          { key: 'A', label: 'Address', detail: 'Answer that specific concern - not the generic version.' },
          { key: 'C', label: 'Close', detail: 'Return to a small, dated next step.' },
        ],
      },
      {
        id: 'm2-s07-b2',
        type: 'text',
        text: 'Objections are not rejections. An objection means the customer is still thinking about it. The full library of twelve KCO objections, each mapped to A.C.A.C., lives in Sales Resources → Objection Handling.',
      },
    ],
  },
  {
    id: 'm2-s08',
    index: '08',
    title: 'Step 7 - Close',
    summary: 'Ask for something small, specific, and dated.',
    blocks: [
      {
        id: 'm2-s08-b1',
        type: 'text',
        text: 'A close is not pressure - it is a clear next action. "I will send the details" is not a close. "Shall I reserve one starter pack for Friday delivery?" is.',
      },
      {
        id: 'm2-s08-b2',
        type: 'comparison',
        caption: 'Weak vs. clear closes',
        columns: ['Weak', 'Clear'],
        rows: [
          ['Let me know po if interested.', 'Shall I reserve a starter pack for Friday delivery?'],
          ['I will send details.', 'I will send the details now - can I call you at 4 PM to confirm?'],
          ['Sige, think about it.', 'Which works better for you, Friday or Monday delivery?'],
        ],
      },
      {
        id: 'm2-s08-b3',
        type: 'dosdonts',
        dos: ['Offer two dates instead of asking yes/no', 'Stay quiet after asking', 'Accept a smaller commitment'],
        donts: ['Ask three times in a row', 'Add a discount you cannot authorise', 'Fill the silence yourself'],
      },
    ],
  },
  {
    id: 'm2-s09',
    index: '09',
    title: 'Step 8 - Confirm + End',
    summary: 'Recap, state next steps, thank them by name.',
    blocks: [
      {
        id: 'm2-s09-b1',
        type: 'script',
        label: 'Confirm and end',
        language: 'mixed',
        lines: [
          'To confirm po - one starter pack, delivery Friday, cash on delivery.',
          'I will message you the order summary right after this call.',
          'If anything changes, you can reply to that same thread.',
          'Thank you for your time, Ms. Rivera. Enjoy your day!',
        ],
      },
      {
        id: 'm2-s09-b2',
        type: 'checklist',
        items: [
          { text: 'Order details repeated back' },
          { text: 'Payment method confirmed' },
          { text: 'Delivery date confirmed' },
          { text: 'Written summary promised and sent' },
          { text: 'Lead record updated before the next call' },
        ],
      },
      {
        id: 'm2-s09-b3',
        type: 'quiz',
        question: 'A customer gives a clear buying signal during Step 4 (Discover). What should you do?',
        options: [
          'Skip to Step 7 and close immediately.',
          'Finish your remaining discovery questions exactly as written.',
          'Acknowledge the signal, ask one confirming question, then present and close.',
          'Ignore it - the steps must run in order.',
        ],
        answerIndex: 2,
        explanation:
          'The order is a guide, not a cage. When a buying signal appears early, confirm it briefly and move to Present and Close - but never close without having recommended a specific package first.',
      },
    ],
  },
]
