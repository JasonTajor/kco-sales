import type { Assessment } from '@/types'

export const assessments: Assessment[] = [
  {
    id: 'asm-phone',
    slug: 'phone-etiquette-check',
    title: 'Phone Etiquette Check',
    description: 'Six questions on greeting, hold, recovery, and what you may never invent.',
    materialId: 'mat-phone-etiquette',
    passingScore: 80,
    timeLimitMinutes: 10,
    attemptsAllowed: 3,
    status: 'published',
    questions: [
      {
        id: 'asm-phone-q1',
        prompt: 'Which opening follows the KCO standard?',
        options: [
          'Hello? Sino po ito?',
          'Good morning! This is Jason from KCO Kangkong Chips. Am I speaking with Ms. Rivera?',
          'Hi, calling about the chips inquiry.',
          'Good morning, KCO here, we have a promo today.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation:
          'Time of day, your name, the full company name, and confirmation of who you are speaking with - before anything about the offer.',
        points: 1,
      },
      {
        id: 'asm-phone-q2',
        prompt: 'A customer needs to be placed on hold. What must happen first?',
        options: [
          'Tell them "wait lang po" and mute.',
          'Ask permission, say why, and give a time estimate.',
          'Put them on hold and explain when you return.',
          'Transfer them to a colleague instead.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation: 'Ask, explain, estimate - then beat the estimate and thank them on return.',
        points: 1,
      },
      {
        id: 'asm-phone-q3',
        prompt: 'The call drops mid-conversation. Who calls back, and what do you do?',
        options: [
          'Wait for the customer to call back.',
          'Call back within a minute, apologise briefly, and resume where you stopped.',
          'Call back and restart the pitch from the greeting.',
          'Send a chat message and wait.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation:
          'The agent always owns the callback, and resuming - not restarting - respects the customer’s time.',
        points: 1,
      },
      {
        id: 'asm-phone-q4',
        prompt: 'You do not know the exact shelf life of the product. What do you say?',
        options: [
          '"Mga 6 months po siguro."',
          '"Hindi ko po alam."',
          '"Let me verify that for you and come back to you within the hour."',
          '"Nasa packaging po yun."',
        ],
        type: 'multiple_choice',
        answerIndex: 2,
        explanation:
          'Never invent a product fact. Commit to verifying, attach a time, and follow through.',
        points: 1,
      },
      {
        id: 'asm-phone-q5',
        prompt: 'A customer says "Sorry, busy ako ngayon." What is the correct response?',
        options: [
          'Explain that it will only take a second and continue.',
          'Acknowledge, offer two specific callback times, confirm one, and end the call.',
          'Ask for the sale quickly before they hang up.',
          'Say you will call back anytime and hang up.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation:
          'Two specific options get a real commitment; "anytime" gets nothing. Then log the callback and honour it.',
        points: 1,
      },
      {
        id: 'asm-phone-q6',
        prompt: 'An angry customer is describing a delivery problem. What do you do first?',
        options: [
          'Explain the courier’s delivery process.',
          'Let them finish completely without defending anything.',
          'Offer a replacement immediately.',
          'Transfer them to a supervisor.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation:
          'Absorb the first wave without interrupting or defending. Only then acknowledge, commit to an action, and give a deadline.',
        points: 1,
      },
    ],
  },
  {
    id: 'asm-chat',
    slug: 'chat-standards-check',
    title: 'Chat Standards Check',
    description: 'Response times, tone, confirmations, and the four openers you see every day.',
    materialId: 'mat-chat-etiquette',
    passingScore: 80,
    timeLimitMinutes: 10,
    attemptsAllowed: 3,
    status: 'published',
    questions: [
      {
        id: 'asm-chat-q1',
        prompt: 'What is the target first-reply time for a new chat?',
        options: ['Within 30 seconds', 'Within 2 minutes', 'Within 15 minutes', 'Same day'],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation: 'Two minutes for a first reply; one minute inside an active conversation.',
        points: 1,
      },
      {
        id: 'asm-chat-q2',
        prompt: 'A customer messages only "Send details po." What is the best reply?',
        options: [
          'Send the full price list and every flavour.',
          'Ask one qualifying question, then send the package that matches.',
          'Reply "Sure po" and wait.',
          'Send a link to the page.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation:
          'One question turns a cold request into a conversation and lets you send something relevant.',
        points: 1,
      },
      {
        id: 'asm-chat-q3',
        prompt: 'Which message meets the KCO chat standard?',
        options: [
          'wla po eh',
          'Wala pa po sa ngayon, but restock is next week. Gusto niyo po bang i-reserve ko?',
          'WALA PO STOCK',
          'no',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation:
          'Answer, add a useful detail, hand back a question - with proper capitalisation and no text-speak.',
        points: 1,
      },
      {
        id: 'asm-chat-q4',
        prompt: 'When should you avoid emoji entirely?',
        options: [
          'In greetings',
          'When confirming an order',
          'In complaint, refund, or bad-news threads',
          'Never - always use emoji',
        ],
        type: 'multiple_choice',
        answerIndex: 2,
        explanation:
          'Emoji soften friendly messages and undermine serious ones. Drop them when a customer is upset or money is disputed.',
        points: 1,
      },
      {
        id: 'asm-chat-q5',
        prompt: 'How many follow-ups may you send to an unresponsive lead?',
        options: ['As many as needed', 'One', 'Two, each adding value', 'Daily until they reply'],
        type: 'multiple_choice',
        answerIndex: 2,
        explanation:
          'Two maximum, and each must add something useful. After that, log the lead as cold and stop.',
        points: 1,
      },
      {
        id: 'asm-chat-q6',
        prompt: 'Which item is NOT required in an order confirmation message?',
        options: [
          'Delivery date and payment method',
          'Quantity, flavour, and total',
          'The name of the supplier who produced the batch',
          'Complete delivery address and contact number',
        ],
        type: 'multiple_choice',
        answerIndex: 2,
        explanation:
          'Supplier identity is confidential company information and never appears in a customer-facing message.',
        points: 1,
      },
    ],
  },
  {
    id: 'asm-objections',
    slug: 'objection-handling-certification',
    title: 'Objection Handling Certification',
    description:
      'A.C.A.C. applied under pressure, including the claims you are prohibited from making.',
    materialId: 'mat-objection-handling',
    passingScore: 85,
    timeLimitMinutes: 15,
    attemptsAllowed: 2,
    status: 'published',
    questions: [
      {
        id: 'asm-obj-q1',
        prompt: 'What does the second letter of A.C.A.C. stand for, and why does it matter?',
        options: [
          'Close - because you should always ask for the sale early.',
          'Clarify - because "mahal" against a budget and "mahal" against a competitor need different answers.',
          'Confirm - because you need the order details in writing.',
          'Convince - because the customer needs persuading.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation:
          'Clarify is the most-skipped step. Without it you answer the generic objection instead of theirs.',
        points: 2,
      },
      {
        id: 'asm-obj-q2',
        prompt: 'A customer asks "Magkano ang kita ko?" What may you say?',
        options: [
          'Quote the average monthly earnings of your top resellers.',
          'Promise they will recover their capital within a month.',
          'Explain that margin depends on their selling price and offer to compute an example from their own numbers.',
          'Say earnings are guaranteed by the company.',
        ],
        type: 'multiple_choice',
        answerIndex: 2,
        explanation:
          'Guaranteed earnings are prohibited. Any computation must be built from the customer’s own assumptions and labelled as an example.',
        points: 2,
      },
      {
        id: 'asm-obj-q3',
        prompt: 'A customer says "May supplier na ako." What is the correct approach?',
        options: [
          'Ask who the supplier is so you can compare.',
          'Offer a price below theirs immediately.',
          'Acknowledge it, ask how consistent their supply is, and position KCO as a backup with no exclusivity requirement.',
          'Explain why their supplier is unreliable.',
        ],
        type: 'multiple_choice',
        answerIndex: 2,
        explanation:
          'Never ask them to break an agreement, never disparage a competitor, and never undercut with a price you cannot honour.',
        points: 2,
      },
      {
        id: 'asm-obj-q4',
        prompt: 'Which is an objection rather than a rejection?',
        options: [
          '"Please do not contact me again."',
          '"Wrong number po."',
          '"Baka hindi ko mabenta."',
          '"Hindi po ako interesado, salamat."',
        ],
        type: 'multiple_choice',
        answerIndex: 2,
        explanation:
          'An objection names a specific obstacle - the customer is still in the conversation. A rejection ends it, and should be accepted gracefully.',
        points: 1,
      },
      {
        id: 'asm-obj-q5',
        prompt: 'A customer says "Mahal naman." Your first move is to:',
        options: [
          'Offer a discount.',
          'Explain that the price is actually reasonable.',
          'Acknowledge the concern, then ask whether it is expensive against their budget or against another supplier.',
          'Move to a cheaper product immediately.',
        ],
        type: 'multiple_choice',
        answerIndex: 2,
        explanation:
          'Acknowledge, then clarify. Discounting first teaches customers to wait for one, and arguing tells them their judgement is wrong.',
        points: 2,
      },
    ],
  },
  {
    id: 'asm-wording',
    slug: 'professional-wording-drill',
    title: 'Professional Wording Drill',
    description: 'Quick swaps - the casual phrase in, the professional version out.',
    materialId: 'mat-professional-wording',
    passingScore: 75,
    timeLimitMinutes: 5,
    attemptsAllowed: 5,
    status: 'published',
    questions: [
      {
        id: 'asm-word-q1',
        prompt: 'Replace: "Wait lang."',
        options: [
          'Hold on.',
          'May I ask you to hold for a moment?',
          'Sandali lang po.',
          'One sec.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation: 'Hold is always requested, never instructed.',
        points: 1,
      },
      {
        id: 'asm-word-q2',
        prompt: 'Replace: "Hindi pwede yan."',
        options: [
          'That is not possible.',
          'What I can do for you instead is…',
          'Sorry, no.',
          'Bawal po yan.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation: 'Every no needs an alternative attached, or the customer has nothing to say yes to.',
        points: 1,
      },
      {
        id: 'asm-word-q3',
        prompt: 'Replace: "Fault yun ng courier."',
        options: [
          'The courier made a mistake.',
          'I am sorry this happened. I am filing it with our logistics team today.',
          'Hindi po namin kasalanan yan.',
          'That is a delivery issue, not ours.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation: 'Never blame a third party by name. Own the next action instead.',
        points: 1,
      },
      {
        id: 'asm-word-q4',
        prompt: 'Replace: "Sure na po yan kikita kayo."',
        options: [
          'You will definitely earn from this.',
          'Ang kita po ay depende sa selling price at area niyo - pwede natin i-compute base sa numbers niyo.',
          'Most resellers earn well.',
          'Guaranteed po ang kita.',
        ],
        type: 'multiple_choice',
        answerIndex: 1,
        explanation: 'Guaranteed earnings are prohibited on every channel.',
        points: 2,
      },
    ],
  },
]

export const assessmentById = (id: string) => assessments.find((a) => a.id === id)
export const assessmentBySlug = (slug: string) => assessments.find((a) => a.slug === slug)
