import type { MaterialSection } from '@/types'

/**
 * Module 4 - The KCO Chat Formula (G.A.L.P.H.C.F.R.).
 */
export const chatFormulaSections: MaterialSection[] = [
  {
    id: 'm4-s01',
    index: '01',
    title: 'The KCO Chat Formula',
    summary: 'Eight letters that carry a chat from hello to a logged outcome.',
    blocks: [
      {
        id: 'm4-s01-b1',
        type: 'text',
        text: 'Phone calls have the 8-step structure. Chat has G.A.L.P.H.C.F.R. It exists because chat is asynchronous - the customer can vanish for a day and come back mid-thought, so you need a map you can rejoin at any point.',
      },
      {
        id: 'm4-s01-b2',
        type: 'formula',
        name: 'G.A.L.P.H.C.F.R.',
        steps: [
          { key: 'G', label: 'Greet', detail: 'Warm greeting, your name, thanks for messaging.' },
          { key: 'A', label: 'Ask', detail: 'One qualifying question before any details go out.' },
          { key: 'L', label: 'Listen', detail: 'Read the whole message. Answer what was actually asked.' },
          { key: 'P', label: 'Present', detail: 'Recommend one package, matched to their answer.' },
          { key: 'H', label: 'Handle', detail: 'Run A.C.A.C. on whatever concern comes back.' },
          { key: 'C', label: 'Close', detail: 'Ask for a specific, dated next step.' },
          { key: 'F', label: 'Follow Up', detail: 'One helpful check-in if the thread goes quiet.' },
          { key: 'R', label: 'Report', detail: 'Log the outcome so the next agent inherits context.' },
        ],
      },
      {
        id: 'm4-s01-b3',
        type: 'quote',
        text: "Don't just reply to the customer. Guide the customer toward the right solution.",
        attribution: 'KCO Golden Rule - Chat Support',
      },
    ],
  },
  {
    id: 'm4-s02',
    index: '02',
    title: 'G - Greet',
    summary: 'Named, warm, and inside two minutes.',
    blocks: [
      {
        id: 'm4-s02-b1',
        type: 'script',
        label: 'Greet',
        language: 'mixed',
        lines: [
          'Hi po! Good morning 😊',
          'Thank you for messaging KCO Kangkong Chips.',
          'This is Jason - how may I help you today?',
        ],
      },
      {
        id: 'm4-s02-b2',
        type: 'bullets',
        items: [
          'Give your name - customers trust a person more than a page.',
          'Thank them for messaging before anything else.',
          'If you are late, apologise for the wait in the same message.',
        ],
      },
    ],
  },
  {
    id: 'm4-s03',
    index: '03',
    title: 'A - Ask',
    summary: 'One question before any details leave your keyboard.',
    blocks: [
      {
        id: 'm4-s03-b1',
        type: 'text',
        text: 'Asking first is what separates chat support from a vending machine. It costs one message and it changes everything you send afterwards.',
      },
      {
        id: 'm4-s03-b2',
        type: 'numbered',
        items: [
          'Are you planning to sell, or is this for personal use?',
          'Online, physical store, or both?',
          'Have you resold food products before?',
          'Which area are you in? (for delivery options)',
        ],
      },
      {
        id: 'm4-s03-b3',
        type: 'callout',
        variant: 'warning',
        title: 'One question at a time',
        text: 'Four questions in one message reads like a form and gets one answer at best. Ask the most useful one, wait, then ask the next.',
      },
    ],
  },
  {
    id: 'm4-s04',
    index: '04',
    title: 'L - Listen',
    summary: 'Read the whole message. Answer the real question.',
    blocks: [
      {
        id: 'm4-s04-b1',
        type: 'text',
        text: 'Chat makes it easy to reply to the first line and miss the second. If a customer asks about price and delivery, answering only the price guarantees a follow-up you could have avoided.',
      },
      {
        id: 'm4-s04-b2',
        type: 'comparison',
        caption: 'Answer everything they asked',
        columns: ['Customer asked', 'A complete reply covers'],
        rows: [
          ['Magkano at kailan ma-deliver?', 'Price, delivery window, and cut-off for that window'],
          ['May Spicy pa ba? Pwede ba 20 packs?', 'Stock status and the minimum order quantity'],
          ['Pwede ba COD sa Cavite?', 'Payment options and Cavite delivery specifics'],
        ],
      },
      {
        id: 'm4-s04-b3',
        type: 'dosdonts',
        dos: ['Re-read before hitting send', 'Answer in the order they asked'],
        donts: ['Answer only the easy half', 'Reply to a message you skimmed'],
      },
    ],
  },
  {
    id: 'm4-s05',
    index: '05',
    title: 'P - Present',
    summary: 'One recommendation, in their words.',
    blocks: [
      {
        id: 'm4-s05-b1',
        type: 'script',
        label: 'Present in chat',
        language: 'mixed',
        lines: [
          'Since online selling po ang plan niyo and first time as reseller,',
          'the starter pack is the best fit 😊',
          '50 packs at ₱200 each, delivery included sa Metro Manila.',
          'Kasama na rin po ang product photos at captions na pwede niyo agad i-post.',
          'Gusto niyo po bang i-reserve ko na para sa Friday delivery?',
        ],
      },
      {
        id: 'm4-s05-b2',
        type: 'callout',
        variant: 'warning',
        title: 'Illustrative only - pending Admin review',
        text: 'If a customer asks about earnings, keep it clearly hypothetical and never guarantee an outcome. Margins depend on their own selling price, area, and effort.',
      },
    ],
  },
  {
    id: 'm4-s06',
    index: '06',
    title: 'H - Handle',
    summary: 'A.C.A.C., in writing.',
    blocks: [
      {
        id: 'm4-s06-b1',
        type: 'formula',
        name: 'A.C.A.C. in chat',
        steps: [
          { key: 'A', label: 'Acknowledge', detail: '"I understand po" - then stop. Do not defend yet.' },
          { key: 'C', label: 'Clarify', detail: 'One question: which part is the concern?' },
          { key: 'A', label: 'Address', detail: 'Answer that exact concern, in two or three short messages.' },
          { key: 'C', label: 'Close', detail: 'Return to a dated next step.' },
        ],
      },
      {
        id: 'm4-s06-b2',
        type: 'scenario',
        customer: 'Price objection in chat',
        situation: 'Ang mahal naman po. May mas mura ba?',
        response:
          'I understand po, Ms. Rivera 😊 May I ask - mahal po ba compared sa budget niyo, or compared sa iba pong supplier? … Kung budget po ang concern, the starter pack is our smallest order kaya mababa ang first commitment. Gusto niyo po bang i-compute natin per pack para makita niyo ang margin?',
        why: 'It acknowledges without agreeing, clarifies which kind of "expensive" this is, addresses the actual version, and closes on a small next step rather than a hard ask.',
      },
    ],
  },
  {
    id: 'm4-s07',
    index: '07',
    title: 'C - Close',
    summary: 'Specific, small, dated.',
    blocks: [
      {
        id: 'm4-s07-b1',
        type: 'comparison',
        caption: 'Closes that work in chat',
        columns: ['Avoid', 'Use'],
        rows: [
          ['Let me know po 😊', 'Gusto niyo po bang i-reserve ko para sa Friday?'],
          ['Interested po ba kayo?', 'Friday or Monday po ang mas okay sa delivery?'],
          ['Sige po, message lang kayo.', 'I will hold one starter pack for you until tomorrow - okay po ba?'],
        ],
      },
      {
        id: 'm4-s07-b2',
        type: 'checklist',
        items: [
          { text: 'A specific action named' },
          { text: 'A date or time attached' },
          { text: 'Easy for the customer to say yes to' },
          { text: 'Asked once, not repeated' },
        ],
      },
    ],
  },
  {
    id: 'm4-s08',
    index: '08',
    title: 'F - Follow Up',
    summary: 'One helpful message. Not three.',
    blocks: [
      {
        id: 'm4-s08-b1',
        type: 'text',
        text: 'A follow-up should add something - a restock date, a photo, an answer you promised. A follow-up that only says "po?" is pressure, and pressure loses the referral even when it wins the order.',
      },
      {
        id: 'm4-s08-b2',
        type: 'script',
        label: 'Follow-up that adds value',
        language: 'mixed',
        lines: [
          'Hi Ms. Rivera! 😊 Following up po sa inquiry niyo.',
          'Ito po pala yung sample photos na pwede niyo i-post pag nag-start na kayo.',
          'Nandito lang po ako kung may tanong kayo - no rush po.',
        ],
      },
      {
        id: 'm4-s08-b3',
        type: 'comparison',
        caption: 'Follow-up cadence',
        columns: ['When', 'What to send'],
        rows: [
          ['24 hours after details sent', 'A useful asset plus an open offer to answer questions'],
          ['3 days after that', 'A relevant update - restock, new flavour, delivery schedule'],
          ['After that', 'Stop. Move the lead to the long-term list.'],
        ],
      },
      {
        id: 'm4-s08-b4',
        type: 'callout',
        variant: 'danger',
        title: 'Two follow-ups maximum',
        text: 'After two unanswered follow-ups, stop messaging and log the lead as cold. Repeated messages get the page reported and cost far more than one lost sale.',
      },
    ],
  },
  {
    id: 'm4-s09',
    index: '09',
    title: 'R - Report',
    summary: 'The step everyone skips, and the one that makes the team work.',
    blocks: [
      {
        id: 'm4-s09-b1',
        type: 'text',
        text: 'The next agent to open that thread - maybe you, on a Monday - needs to know what was quoted, what was promised, and what the objection was. Reporting is how a chat becomes company knowledge instead of a private conversation.',
      },
      {
        id: 'm4-s09-b2',
        type: 'checklist',
        items: [
          { text: 'Outcome logged', hint: 'Ordered / interested / cold / complaint' },
          { text: 'Quantity and flavour quoted' },
          { text: 'Objection recorded in the customer’s own words' },
          { text: 'Any promise made, and its deadline' },
          { text: 'Next action and date' },
        ],
      },
      {
        id: 'm4-s09-b3',
        type: 'quiz',
        question: 'A chat lead has not replied to your details or your first follow-up. What does the formula say to do?',
        options: [
          'Send a daily follow-up until they answer.',
          'Send one more follow-up with something genuinely useful, then stop and log the lead as cold.',
          'Stop immediately - one follow-up is the limit.',
          'Call their number instead, repeatedly.',
        ],
        answerIndex: 1,
        explanation:
          'Two follow-ups maximum, and each one must add value. After that, log the outcome (R - Report) and move on. Persistent messaging gets pages reported and damages the brand.',
      },
    ],
  },
]
