import type { MaterialSection } from '@/types'

/**
 * Module 3 - Chat Etiquette.
 * The 22 chat rules, grouped into ten workable sections.
 */
export const chatEtiquetteSections: MaterialSection[] = [
  {
    id: 'm3-s01',
    index: '01',
    title: 'Always Greet, Always Respond Promptly',
    summary: 'Speed and a greeting do most of the work in chat.',
    blocks: [
      {
        id: 'm3-s01-b1',
        type: 'text',
        text: 'In chat, the customer is comparing you to every other page they messaged. A greeting within the first reply and a response inside two minutes is the difference between a conversation and a "seen".',
      },
      {
        id: 'm3-s01-b2',
        type: 'script',
        label: 'Opening a new chat',
        language: 'mixed',
        lines: [
          'Hi po! Good afternoon 😊',
          'Thank you for messaging KCO Kangkong Chips.',
          'This is Jason - how may I help you today?',
        ],
      },
      {
        id: 'm3-s01-b3',
        type: 'comparison',
        caption: 'Response time targets',
        columns: ['Situation', 'Target'],
        rows: [
          ['First reply to a new chat', 'Within 2 minutes'],
          ['Follow-up inside an active chat', 'Within 1 minute'],
          ['Needs verification from a team lead', 'Acknowledge in 1 min, answer within 30 min'],
          ['Received outside business hours', 'First reply at open, with an apology for the wait'],
        ],
      },
      {
        id: 'm3-s01-b4',
        type: 'callout',
        variant: 'info',
        title: 'If you need time',
        text: 'Never go silent while you check something. Send "Let me check that for you po, one moment 😊" - an acknowledged wait is not a wait.',
      },
    ],
  },
  {
    id: 'm3-s02',
    index: '02',
    title: 'Never Use One-Word Answers',
    summary: 'Answer, then add value, then ask something.',
    blocks: [
      {
        id: 'm3-s02-b1',
        type: 'text',
        text: 'A one-word reply ends the conversation and puts all the work on the customer. Every reply should answer the question, add one useful detail, and hand the conversation back with a question.',
      },
      {
        id: 'm3-s02-b2',
        type: 'comparison',
        caption: 'The three-part reply',
        columns: ['One-word reply', 'Complete reply'],
        rows: [
          ['Yes.', 'Yes po, available pa ang Original flavour! Ready for delivery this week. Ilan pong packs ang balak niyo?'],
          ['200.', 'The starter pack is ₱200 per unit po. Nasa loob na po ang delivery within Metro Manila. Would you like me to compute for 50 packs?'],
          ['Wala pa.', 'Not yet available po ang Spicy variant - restock is next week. Gusto niyo po ba i-reserve ko na para sa inyo?'],
        ],
      },
      {
        id: 'm3-s02-b3',
        type: 'dosdonts',
        dos: ['Always end with a question', 'Add one detail they did not ask for but will need'],
        donts: ['Reply "yes", "no", "wala", or "opo" alone', 'Send a bare price with no context'],
      },
    ],
  },
  {
    id: 'm3-s03',
    index: '03',
    title: 'Professional Language, Capitalisation, and Emoji',
    summary: 'Friendly, not sloppy.',
    blocks: [
      {
        id: 'm3-s03-b1',
        type: 'text',
        text: 'Chat is informal, but you are still the company. Proper capitalisation and complete words signal that a real, competent person is on the other side. Taglish is fine - text-speak is not.',
      },
      {
        id: 'm3-s03-b2',
        type: 'wording',
        pairs: [
          { avoid: 'ok po sure', use: 'Sure po! 😊' },
          { avoid: 'wla po eh', use: 'Wala pa po sa ngayon, but restock is next week.' },
          { avoid: 'MAGKANO PO ORDER NYO', use: 'How many packs po would you like to order?' },
          { avoid: 'thnx po', use: 'Thank you po!' },
          { avoid: 'sry d ko alam', use: 'Let me verify that for you po.' },
        ],
      },
      {
        id: 'm3-s03-b3',
        type: 'checklist',
        items: [
          { text: 'Sentences start with a capital letter' },
          { text: 'No ALL CAPS except a single word for emphasis' },
          { text: 'No text-speak: nyo → niyo, d → hindi, pls → please' },
          { text: 'One or two emoji per message, maximum', hint: '😊 and 🙏 carry most of the warmth you need' },
          { text: 'Never an emoji in a complaint or refund thread' },
        ],
      },
      {
        id: 'm3-s03-b4',
        type: 'callout',
        variant: 'warning',
        title: 'Emoji discipline',
        text: 'Emoji soften a friendly message and undermine a serious one. Use them in greetings, thanks, and confirmations. Drop them entirely when a customer is upset, when money is disputed, or when you are delivering bad news.',
      },
    ],
  },
  {
    id: 'm3-s04',
    index: '04',
    title: 'Personalise, but Do Not Overload',
    summary: 'Use their name. Send one idea per message.',
    blocks: [
      {
        id: 'm3-s04-b1',
        type: 'text',
        text: 'A wall of text gets skimmed, and a skimmed message means the customer misses the price or the cut-off. Break your answer into short messages, one idea each - but do not send eight messages in a row either.',
      },
      {
        id: 'm3-s04-b2',
        type: 'dosdonts',
        dos: [
          'Use their name once early and once when you close',
          'Split a long answer into two or three short messages',
          'Send the price, then the inclusions, then your question',
        ],
        donts: [
          'Paste the full catalogue into one message',
          'Send every flavour, every price, and every promo unasked',
          'Machine-gun ten one-line messages',
        ],
      },
      {
        id: 'm3-s04-b3',
        type: 'scenario',
        customer: 'New lead, asked only about price',
        situation: 'Ma’am, magkano po lahat ng flavors?',
        response:
          'Hi Ms. Rivera! 😊 Ang starter pack po ay ₱200 per unit, minimum 50 packs. Kasama na po ang delivery sa Metro Manila. May tatlong flavour po kami - Original, Spicy, at Cheese. Ano pong flavour ang interesado kayo?',
        why: 'It answers the actual question first, adds the two details she will need next (minimum and delivery), and hands back one simple question instead of the entire product list.',
      },
    ],
  },
  {
    id: 'm3-s05',
    index: '05',
    title: 'Never Argue, Never Guess, Never Overshare',
    summary: 'Three rules that protect you and the company.',
    blocks: [
      {
        id: 'm3-s05-b1',
        type: 'text',
        text: 'Chat is written and permanent. A screenshot of an argument, a wrong guess, or internal information travels further than any sale you make that day.',
      },
      {
        id: 'm3-s05-b2',
        type: 'dosdonts',
        dos: [
          'Stay calm and factual even when the customer is not',
          'Say "let me verify" instead of guessing',
          'Escalate anything about refunds, permits, or supplier terms',
        ],
        donts: [
          'Argue, correct their grammar, or match their tone',
          'Guess at ingredients, shelf life, permits, or delivery windows',
          'Share supplier names, internal pricing, margins, or other customers’ details',
          'Promise a discount, refund, or exclusivity you cannot authorise',
        ],
      },
      {
        id: 'm3-s05-b3',
        type: 'callout',
        variant: 'danger',
        title: 'Unauthorised information',
        text: 'Supplier identities, factory locations, internal cost, other resellers’ territories and volumes, and any unapproved promo are not yours to share. If a customer presses, say it is company-confidential and offer what you can share instead.',
      },
    ],
  },
  {
    id: 'm3-s06',
    index: '06',
    title: 'The Four Openers You Will See Every Day',
    summary: '"Send details", "How much?", pressure, and "I\'ll think about it".',
    blocks: [
      {
        id: 'm3-s06-b1',
        type: 'text',
        text: 'Most KCO chats begin with one of four messages. Having a real answer ready for each one is most of the job.',
      },
      {
        id: 'm3-s06-b2',
        type: 'scenario',
        customer: '"Send details po"',
        situation: 'A one-line request with no context at all.',
        response:
          'Sure po! 😊 Before I send, may I ask - are you planning to sell online, sa physical store, or for personal use? Para po ma-send ko yung tamang package details para sa inyo.',
        why: 'Sending a generic brochure gets ignored. One qualifying question turns a cold request into a conversation and lets you send the package that actually fits.',
      },
      {
        id: 'm3-s06-b3',
        type: 'scenario',
        customer: '"How much?"',
        situation: 'Price-first message, no other information.',
        response:
          'Hi po! Ang starter pack po ay ₱200 per unit, minimum 50 packs, delivery included sa Metro Manila. Para po sa reseller pricing, ilan pong packs ang tinitignan niyo?',
        why: 'Answer the price directly - dodging it destroys trust. Then add the minimum and delivery so there are no surprises, and ask a question that moves toward volume.',
      },
      {
        id: 'm3-s06-b4',
        type: 'scenario',
        customer: '"Pag-iisipan ko po"',
        situation: 'Soft exit after you sent the details.',
        response:
          'Of course po, Ms. Rivera - take your time 😊 May I ask, ano pong part ang pinag-iisipan niyo, yung price or yung pagbebenta? Baka po may matulong ako para mas madali ang decision.',
        why: 'Accept it, then clarify once. Thinking about it is not a no - it is an unnamed concern. One respectful question usually surfaces it.',
      },
      {
        id: 'm3-s06-b5',
        type: 'callout',
        variant: 'success',
        title: 'No pressure selling',
        text: 'Never send repeated "buy na po" messages, false urgency, or guilt. One helpful follow-up is service. Three is harassment, and it costs KCO the referral too.',
      },
    ],
  },
  {
    id: 'm3-s07',
    index: '07',
    title: 'Read the Entire Conversation Before Replying',
    summary: 'Especially when you inherit a thread.',
    blocks: [
      {
        id: 'm3-s07-b1',
        type: 'text',
        text: 'Nothing makes a customer repeat themselves faster than an agent who did not scroll up. Before your first message in an inherited thread, read the whole history and pick up where the last agent stopped.',
      },
      {
        id: 'm3-s07-b2',
        type: 'checklist',
        items: [
          { text: 'Scroll to the start of the thread' },
          { text: 'Note what was already quoted - price, flavour, quantity' },
          { text: 'Note any promise made and whether it was kept' },
          { text: 'Acknowledge the history in your first message' },
        ],
      },
      {
        id: 'm3-s07-b3',
        type: 'script',
        label: 'Taking over a thread',
        language: 'mixed',
        lines: [
          'Hi Ms. Rivera, this is Jason from KCO 😊',
          'I have read your conversation with my colleague.',
          'I see you are looking at 50 packs of Original for Friday delivery.',
          'Let me take it from here po - shall I confirm that order?',
        ],
      },
    ],
  },
  {
    id: 'm3-s08',
    index: '08',
    title: 'Order Confirmation',
    summary: 'Repeat it back in writing. Every time, no exceptions.',
    blocks: [
      {
        id: 'm3-s08-b1',
        type: 'text',
        text: 'A written confirmation is what protects both sides when something goes wrong. Send it as one clean message the customer can screenshot.',
      },
      {
        id: 'm3-s08-b2',
        type: 'script',
        label: 'Order summary message',
        language: 'mixed',
        lines: [
          'Confirming your order po, Ms. Rivera 😊',
          'Item: Kangkong Chips - Original',
          'Quantity: 50 packs',
          'Total: ₱10,000',
          'Delivery: Friday, within Metro Manila',
          'Payment: Cash on delivery',
          'Delivery address: [full address]',
          'Contact number: [number]',
          'Tama po ba lahat?',
        ],
      },
      {
        id: 'm3-s08-b3',
        type: 'checklist',
        items: [
          { text: 'Item and flavour' },
          { text: 'Quantity' },
          { text: 'Total amount' },
          { text: 'Delivery date' },
          { text: 'Payment method' },
          { text: 'Complete delivery address' },
          { text: 'Contact number' },
          { text: 'Explicit "tama po ba?" confirmation received' },
        ],
      },
    ],
  },
  {
    id: 'm3-s09',
    index: '09',
    title: 'Complaint Handling in Chat',
    summary: 'Acknowledge, apologise, act, follow up.',
    blocks: [
      {
        id: 'm3-s09-b1',
        type: 'numbered',
        items: [
          'Reply fast - a complaint left on seen becomes a public post.',
          'Acknowledge the specific problem in their own words.',
          'Apologise for the experience without assigning blame.',
          'State what you will do and by when.',
          'Follow up when you said you would, even if there is no news yet.',
        ],
      },
      {
        id: 'm3-s09-b2',
        type: 'script',
        label: 'Damaged goods complaint',
        language: 'mixed',
        lines: [
          'I am really sorry about this, Ms. Rivera.',
          'To confirm po - 6 out of 50 packs arrived crushed?',
          'I am filing this with our logistics team right now.',
          'I will update you before 5 PM today with the replacement schedule.',
          'Thank you for the photo, malaking tulong po ito sa report.',
        ],
      },
      {
        id: 'm3-s09-b3',
        type: 'dosdonts',
        dos: ['Ask for a photo early', 'Give a reference number', 'Keep every promised follow-up'],
        donts: [
          'Use emoji in a complaint thread',
          'Blame the courier by name',
          'Say "that never happens"',
          'Go quiet while waiting for a decision',
        ],
      },
    ],
  },
  {
    id: 'm3-s10',
    index: '10',
    title: 'Professional Closing and Chat Don’ts',
    summary: 'End every chat on purpose, not by trailing off.',
    blocks: [
      {
        id: 'm3-s10-b1',
        type: 'script',
        label: 'Closing a chat',
        language: 'mixed',
        lines: [
          'Thank you po for your time, Ms. Rivera! 😊',
          'Nandito lang po ako kung may tanong pa kayo.',
          'Have a great day po!',
        ],
      },
      {
        id: 'm3-s10-b2',
        type: 'bullets',
        items: [
          'Never leave a chat on seen without a closing message.',
          'Never end with "ok" or "noted" alone.',
          'Never leave a question unanswered because the sale did not happen.',
          'Never argue for the last word.',
          'Never send screenshots of internal conversations.',
          'Never use another reseller as a comparison by name.',
        ],
      },
      {
        id: 'm3-s10-b3',
        type: 'quiz',
        question: 'A customer sends only "Send details po." What is the best first reply?',
        options: [
          'Send the complete price list, all flavours, and all promos immediately.',
          'Ask one qualifying question about how they plan to sell, then send the matching package.',
          'Reply "Sure po" and wait for them to ask something specific.',
          'Send a link to the Facebook page and let them read it.',
        ],
        answerIndex: 1,
        explanation:
          'A generic brochure gets ignored, and a bare "Sure po" stalls. One qualifying question lets you send details that actually fit and keeps the conversation alive.',
      },
    ],
  },
]
