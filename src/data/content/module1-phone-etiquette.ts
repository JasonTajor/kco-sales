import type { MaterialSection } from '@/types'

/**
 * Module 1 - Phone Etiquette.
 * 14 sections covering the call from hello to hang-up.
 */
export const phoneEtiquetteSections: MaterialSection[] = [
  {
    id: 'm1-s01',
    index: '01',
    title: 'Answer Professionally',
    summary: 'The first seven seconds decide whether the customer keeps listening.',
    blocks: [
      {
        id: 'm1-s01-b1',
        type: 'text',
        text: 'A prospect cannot see your office, your ID, or your product. The only evidence they have that KCO is a real, professional company is the first sentence you say. Answer the same way every time so it becomes muscle memory.',
      },
      {
        id: 'm1-s01-b2',
        type: 'script',
        label: 'Standard outbound opening',
        language: 'mixed',
        lines: [
          'Good morning! This is Jason from KCO Kangkong Chips.',
          'Am I speaking with Ms. Rivera?',
          'I am following up on your inquiry about becoming a KCO reseller.',
          'Is now a good time for a quick two-minute call?',
        ],
      },
      {
        id: 'm1-s01-b3',
        type: 'checklist',
        items: [
          { text: 'Greet with the time of day', hint: 'Good morning / afternoon / evening' },
          { text: 'Give your first name' },
          { text: 'Say the company name in full - KCO Kangkong Chips' },
          { text: 'Confirm you are speaking to the right person' },
          { text: 'State why you are calling in one sentence' },
          { text: 'Ask permission for their time' },
        ],
      },
      {
        id: 'm1-s01-b4',
        type: 'dosdonts',
        dos: [
          'Answer within three rings',
          'Sit up straight - posture is audible',
          'Have the inquiry details on screen before you dial',
        ],
        donts: [
          'Answer with a bare "Hello?"',
          'Mumble the company name',
          'Launch into the offer before confirming who you are talking to',
        ],
      },
    ],
  },
  {
    id: 'm1-s02',
    index: '02',
    title: 'Smile Before Speaking',
    summary: 'A smile changes the shape of your mouth and the tone of your voice.',
    blocks: [
      {
        id: 'm1-s02-b1',
        type: 'text',
        text: 'Smiling raises the pitch and softens the edges of your voice. The customer cannot see it, but they can hear the difference immediately - and so can you, if you record yourself twice and compare.',
      },
      {
        id: 'm1-s02-b2',
        type: 'callout',
        variant: 'info',
        title: 'Try this before your first call of the day',
        text: 'Say your opening line twice into a recorder: once flat, once smiling. Play both back. The smiling version is the one a customer trusts.',
      },
      {
        id: 'm1-s02-b3',
        type: 'bullets',
        items: [
          'Keep a small mirror at your station - it is the cheapest coaching tool available.',
          'Stand up for difficult calls; your breath support improves and your energy carries.',
          'If you have had a hard call, take ten seconds and reset before dialling the next one.',
        ],
      },
    ],
  },
  {
    id: 'm1-s03',
    index: '03',
    title: 'Speak Clearly',
    summary: 'Pace, volume, and articulation - before vocabulary.',
    blocks: [
      {
        id: 'm1-s03-b1',
        type: 'text',
        text: 'Most unclear calls are not accent problems. They are speed problems. When you are nervous you speed up, and the customer stops absorbing details like price, minimum order, and delivery time - exactly the details that close a sale.',
      },
      {
        id: 'm1-s03-b2',
        type: 'comparison',
        caption: 'Slow down where it counts',
        columns: ['Say this at normal pace', 'Slow down deliberately here'],
        rows: [
          ['Small talk and rapport', 'Prices and package amounts'],
          ['Explaining the product story', 'Minimum order quantity'],
          ['Answering general questions', 'Delivery timelines and cut-offs'],
          ['Closing pleasantries', 'Your name and callback number'],
        ],
      },
      {
        id: 'm1-s03-b3',
        type: 'checklist',
        items: [
          { text: 'Numbers said twice', hint: 'Say the figure, then repeat it' },
          { text: 'Mouth roughly a fist away from the mic' },
          { text: 'No gum, no food, no drink' },
          { text: 'Background noise checked before dialling' },
        ],
      },
    ],
  },
  {
    id: 'm1-s04',
    index: '04',
    title: "Don't Interrupt",
    summary: 'Let the customer finish. The last three words usually carry the real objection.',
    blocks: [
      {
        id: 'm1-s04-b1',
        type: 'text',
        text: 'Interrupting costs you the information you need most. When a customer trails off, they are often about to name the real hesitation - budget, a spouse who decides, a bad experience with another supplier.',
      },
      {
        id: 'm1-s04-b2',
        type: 'dosdonts',
        dos: [
          'Wait a full beat after they stop speaking',
          'Use short acknowledgements: "I see", "Got it", "Understood"',
          'Take notes instead of talking',
        ],
        donts: [
          'Finish their sentence for them',
          'Talk over a complaint to defend the product',
          'Jump to the price the moment you hear hesitation',
        ],
      },
      {
        id: 'm1-s04-b3',
        type: 'callout',
        variant: 'success',
        title: 'The two-second rule',
        text: 'Count two silent seconds after the customer finishes before you reply. It feels long to you and natural to them, and it almost eliminates accidental interruptions.',
      },
    ],
  },
  {
    id: 'm1-s05',
    index: '05',
    title: "Use the Customer's Name",
    summary: 'Two or three times per call - enough to feel personal, not rehearsed.',
    blocks: [
      {
        id: 'm1-s05-b1',
        type: 'text',
        text: 'Using a name earns attention at the exact moments you need it: when you start, when you present the offer, and when you close. Use the honorific until they tell you otherwise.',
      },
      {
        id: 'm1-s05-b2',
        type: 'script',
        label: 'Placement that works',
        language: 'mixed',
        lines: [
          'Opening - "Good afternoon, Ms. Rivera, this is Jason from KCO."',
          'Presenting - "Ms. Rivera, based on what you said about your store, the starter pack fits best."',
          'Closing - "Ms. Rivera, shall I reserve one for delivery this Friday?"',
        ],
      },
      {
        id: 'm1-s05-b3',
        type: 'dosdonts',
        dos: ['Confirm the spelling and pronunciation once', 'Default to Ms. / Mr. / Sir / Ma’am'],
        donts: [
          'Use the name in every second sentence - it sounds like a script',
          'Guess a nickname you were never given',
          'Switch to first names before they do',
        ],
      },
    ],
  },
  {
    id: 'm1-s06',
    index: '06',
    title: 'Ask Questions',
    summary: 'A discovery question is worth more than three product features.',
    blocks: [
      {
        id: 'm1-s06-b1',
        type: 'text',
        text: 'You cannot recommend a package until you know what the customer is selling into. Four questions is usually enough to pick the right pack and the right talking points.',
      },
      {
        id: 'm1-s06-b2',
        type: 'numbered',
        items: [
          'Are you selling online, in a physical store, or both?',
          'Have you resold snacks or food products before?',
          'Roughly how many customers do you reach in a week?',
          'What made you interested in Kangkong Chips specifically?',
        ],
      },
      {
        id: 'm1-s06-b3',
        type: 'comparison',
        caption: 'Open questions gather; closed questions confirm',
        columns: ['Open - use in discovery', 'Closed - use to confirm'],
        rows: [
          ['What are you selling right now?', 'So you are selling mainly online, correct?'],
          ['How do your customers usually order?', 'Would delivery on Friday work?'],
          ['What worried you about other suppliers?', 'Shall I reserve the starter pack for you?'],
        ],
      },
    ],
  },
  {
    id: 'm1-s07',
    index: '07',
    title: "Don't Sound Like You're Reading a Script",
    summary: 'Learn the structure, then speak like a person.',
    blocks: [
      {
        id: 'm1-s07-b1',
        type: 'text',
        text: 'Scripts exist so you never lose the thread - not so you can read them aloud. Memorise the eight steps of the call, keep the exact wording for prices and policies, and improvise everything in between.',
      },
      {
        id: 'm1-s07-b2',
        type: 'comparison',
        caption: 'Same information, different delivery',
        columns: ['Read aloud', 'Spoken naturally'],
        rows: [
          [
            'We are pleased to offer our premium Kangkong Chips product line at competitive reseller pricing.',
            'So the starter pack gives you 50 packs, and most resellers start there to test their market.',
          ],
          [
            'Kindly be informed that the minimum order quantity is fifty units.',
            'The smallest order we do is 50 packs - that keeps your cost per pack low.',
          ],
        ],
      },
      {
        id: 'm1-s07-b3',
        type: 'callout',
        variant: 'warning',
        title: 'Keep these word-for-word',
        text: 'Prices, minimum order quantities, delivery cut-offs, and anything about returns. Improvising on these creates promises the company has to keep.',
      },
    ],
  },
  {
    id: 'm1-s08',
    index: '08',
    title: 'Handling "I’m Busy"',
    summary: 'Do not push. Take a smaller commitment instead.',
    blocks: [
      {
        id: 'm1-s08-b1',
        type: 'text',
        text: '"I am busy" is rarely a refusal - it is a request for a different time. Acknowledge it, ask for a slot, and get off the phone quickly. Respecting their time is itself a sales argument.',
      },
      {
        id: 'm1-s08-b2',
        type: 'script',
        label: 'The 20-second exit',
        language: 'mixed',
        lines: [
          'Customer: Sorry, busy ako ngayon.',
          'You: Naku, understood po - I will keep this short.',
          'You: Would it be better if I call you back later today, or tomorrow morning?',
          'Customer: Tomorrow morning na lang.',
          'You: Perfect. I will call at 9 AM tomorrow. Thank you, Ms. Rivera!',
        ],
      },
      {
        id: 'm1-s08-b3',
        type: 'dosdonts',
        dos: [
          'Offer two specific time options, not "anytime"',
          'Confirm the callback time out loud',
          'Log the callback immediately',
        ],
        donts: [
          'Say "this will only take a second" and then talk for five minutes',
          'Ask for the sale anyway',
          'Call back at a time you did not agree on',
        ],
      },
    ],
  },
  {
    id: 'm1-s09',
    index: '09',
    title: 'Handling Angry Customers',
    summary: 'Let them finish, own the problem, give the next step.',
    blocks: [
      {
        id: 'm1-s09-b1',
        type: 'text',
        text: 'An angry customer is usually angry about a delivery, a damaged box, or a promise someone else made. None of that is personal. Your job is to absorb the first wave without arguing, then convert the call into a concrete next action.',
      },
      {
        id: 'm1-s09-b2',
        type: 'numbered',
        items: [
          'Let them finish completely - do not defend anything yet.',
          'Acknowledge the specific problem in their words.',
          'Apologise for the experience, not for a fault you have not verified.',
          'State exactly what you will do and by when.',
          'Confirm the callback and follow through.',
        ],
      },
      {
        id: 'm1-s09-b3',
        type: 'script',
        label: 'Damaged delivery',
        language: 'mixed',
        lines: [
          'I hear you, Ms. Rivera, and I am sorry this happened with your delivery.',
          'Let me make sure I have it right: six packs out of fifty arrived crushed. Correct po?',
          'Here is what I will do - I will file this with our logistics team today and send you the reference number.',
          'I will call you back before 5 PM with the replacement schedule.',
        ],
      },
      {
        id: 'm1-s09-b4',
        type: 'callout',
        variant: 'danger',
        title: 'Never do this on an angry call',
        text: 'Do not raise your voice, do not blame the courier or a colleague by name, and do not promise a refund, discount, or replacement you are not authorised to approve. Escalate instead.',
      },
    ],
  },
  {
    id: 'm1-s10',
    index: '10',
    title: "When You Don't Know the Answer",
    summary: 'Verify. Never invent.',
    blocks: [
      {
        id: 'm1-s10-b1',
        type: 'text',
        text: 'Guessing about shelf life, ingredients, permits, or pricing creates a problem the whole company inherits. Saying you will verify costs you nothing - customers read it as competence, not weakness.',
      },
      {
        id: 'm1-s10-b2',
        type: 'wording',
        pairs: [
          { avoid: 'Hindi ko alam.', use: 'Let me verify that for you and come right back.' },
          { avoid: 'I think around 6 months siguro.', use: 'I want to give you the exact shelf life - let me confirm and message you today.' },
          { avoid: 'Basta approved yan.', use: 'Let me send you the exact documentation so you have it in writing.' },
        ],
      },
      {
        id: 'm1-s10-b3',
        type: 'checklist',
        items: [
          { text: 'Say you will verify, with a time commitment' },
          { text: 'Write the question down before you hang up' },
          { text: 'Ask your team lead, not a fellow agent guessing' },
          { text: 'Follow up even if the answer is no' },
        ],
      },
    ],
  },
  {
    id: 'm1-s11',
    index: '11',
    title: 'Phone Hold Etiquette',
    summary: 'Ask, explain, thank - and never exceed the time you promised.',
    blocks: [
      {
        id: 'm1-s11-b1',
        type: 'script',
        label: 'Placing a customer on hold',
        language: 'mixed',
        lines: [
          'May I ask you to hold for a moment while I check your order details?',
          'It should take about one minute. Is that okay po?',
          '[on return] Thank you for waiting, Ms. Rivera.',
        ],
      },
      {
        id: 'm1-s11-b2',
        type: 'dosdonts',
        dos: [
          'Always ask permission first',
          'Say why you need the hold',
          'Give a time estimate and beat it',
          'Check back in if it runs long',
          'Thank them when you return',
        ],
        donts: [
          'Say "wait lang" and drop the line',
          'Leave anyone on hold past two minutes without checking in',
          'Forget who is on the other line',
        ],
      },
    ],
  },
  {
    id: 'm1-s12',
    index: '12',
    title: 'Call Drops',
    summary: 'Whoever called, calls back. Always the agent.',
    blocks: [
      {
        id: 'm1-s12-b1',
        type: 'text',
        text: 'A dropped call is not the customer’s problem to solve. Call back within one minute, apologise briefly, and pick up exactly where you left off - do not restart the whole pitch.',
      },
      {
        id: 'm1-s12-b2',
        type: 'script',
        label: 'Reconnecting',
        language: 'mixed',
        lines: [
          'Hi Ms. Rivera, sorry po - nadiscon ang linya.',
          'This is Jason from KCO again. We were at the delivery schedule.',
          'You mentioned Friday works for you - shall I confirm that?',
        ],
      },
      {
        id: 'm1-s12-b3',
        type: 'bullets',
        items: [
          'If they do not pick up, send one short SMS or chat message with your name and callback time.',
          'Log the drop so the next agent sees the history.',
          'Two failed attempts - move to chat rather than calling a third time.',
        ],
      },
    ],
  },
  {
    id: 'm1-s13',
    index: '13',
    title: 'Never Eat While on a Call',
    summary: 'It is audible, and it reads as disrespect.',
    blocks: [
      {
        id: 'm1-s13-b1',
        type: 'text',
        text: 'Headset microphones sit close to your mouth and pick up chewing, straws, and wrappers with uncomfortable clarity. Eating on a call tells the customer they are not worth full attention - and on a food product call it is worse.',
      },
      {
        id: 'm1-s13-b2',
        type: 'dosdonts',
        dos: [
          'Finish food before your shift block',
          'Keep water within reach and sip between calls',
          'Mute if you need to clear your throat',
        ],
        donts: ['Chew gum', 'Eat during hold', 'Take a call with food in your mouth'],
      },
    ],
  },
  {
    id: 'm1-s14',
    index: '14',
    title: 'Professional Wording',
    summary: 'Same meaning, better delivery. The full library lives in Quick Reference.',
    blocks: [
      {
        id: 'm1-s14-b1',
        type: 'text',
        text: 'Casual phrasing is not rude in daily conversation, but on a sales call it makes the company sound informal. These swaps are the highest-frequency ones on the phone.',
      },
      {
        id: 'm1-s14-b2',
        type: 'wording',
        pairs: [
          { avoid: 'Wait lang.', use: 'May I ask you to hold for a moment?' },
          { avoid: 'Hindi ko alam.', use: 'Let me verify that for you.' },
          { avoid: 'Di ko gets.', use: 'May I clarify what you mean?' },
          { avoid: 'Ha? Ano po?', use: 'I am sorry, could you repeat that please?' },
          { avoid: 'Wala kami niyan.', use: 'That variant is not available right now - may I suggest an alternative?' },
          { avoid: 'Sige, bye.', use: 'Thank you for your time, Ms. Rivera. Have a good day!' },
        ],
      },
      {
        id: 'm1-s14-b3',
        type: 'quiz',
        question: 'A customer asks for the exact shelf life and you are not sure. What is the correct response?',
        options: [
          'Give your best estimate so the call keeps moving.',
          'Tell them you will verify and commit to a time to come back with the exact figure.',
          'Say it depends and change the subject to price.',
          'Transfer the call without explanation.',
        ],
        answerIndex: 1,
        explanation:
          'Never invent product facts. Committing to verify - with a specific callback time - protects the customer and the company, and customers consistently read it as professionalism.',
      },
    ],
  },
]
