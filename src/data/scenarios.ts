import type { CustomerPersonality, PracticeScenario } from '@/types'
import type { EmojiName } from './emoji'

/**
 * Practice Scenarios - mock engine.
 * Turns are hand-authored branches. A future backend/AI service can replace the
 * `turns` array without touching the runner UI.
 */

export const personalityMeta: Record<
  CustomerPersonality,
  { label: string; blurb: string; emoji: EmojiName }
> = {
  angry: { label: 'Angry Customer', blurb: 'Something went wrong and they are done being polite.', emoji: 'angry' },
  sleepy: { label: 'Sleepy Customer', blurb: 'Low energy, short answers, easily lost.', emoji: 'sleepy' },
  confused: { label: 'Confused Customer', blurb: 'Asks the same thing three different ways.', emoji: 'confused' },
  cheap: { label: 'Cheap Customer', blurb: 'Every reply comes back to price.', emoji: 'money' },
  funny: { label: 'Funny Customer', blurb: 'Jokes constantly - hard to steer back on track.', emoji: 'laugh' },
  'seen-zone': { label: 'Seen Zone Customer', blurb: 'Reads everything, replies to nothing.', emoji: 'eyes' },
  curious: { label: 'Super Curious Customer', blurb: 'Twenty questions before any commitment.', emoji: 'thinking' },
  busy: { label: '"I\'m Busy" Customer', blurb: 'Thirty seconds of attention, maximum.', emoji: 'clock' },
  'send-details': { label: '"Send Details" Customer', blurb: 'One line, no context, wants a brochure.', emoji: 'box' },
}

export const practiceScenarios: PracticeScenario[] = [
  {
    id: 'sc-angry-delivery',
    slug: 'angry-damaged-delivery',
    title: 'Crushed Packs on Arrival',
    channel: 'phone',
    personality: 'angry',
    difficulty: 'advanced',
    setup:
      'Ms. Rivera ordered 50 packs. Six arrived crushed. She has already messaged the page twice with no reply and is now on the phone.',
    goal: 'Absorb the anger without arguing, commit to a specific action with a deadline, and keep the reseller.',
    coaching: [
      'Let her finish the first complaint completely - do not defend anything.',
      'Acknowledge the specific number: six of fifty.',
      'Never blame the courier by name.',
      'Give a deadline you can actually meet.',
    ],
    turns: [
      {
        id: 'sc-angry-t1',
        customer:
          'Dalawang beses na akong nag-message sa page niyo, walang sumasagot! Anim sa fifty packs, durog lahat. Paano ko ibebenta yan?!',
        choices: [
          {
            text: 'I hear you, Ms. Rivera, and I am sorry this happened. To confirm po - six out of fifty arrived crushed?',
            verdict: 'best',
            feedback:
              'Acknowledges the experience and confirms the specific facts without defending anything. This is the correct first move.',
          },
          {
            text: 'Ma’am, that is the courier’s handling, hindi po namin kasalanan yan.',
            verdict: 'poor',
            feedback:
              'Blaming a third party in the first ten seconds tells the customer nobody will own the problem. Never name the courier.',
          },
          {
            text: 'Sorry po. Pwede po ba kayong mag-file ng claim sa courier?',
            verdict: 'poor',
            feedback:
              'Pushing the work onto an already-angry customer. KCO files the ticket, not the reseller.',
          },
        ],
      },
      {
        id: 'sc-angry-t2',
        customer: 'Oo, anim. May picture ako. So ano, sagot niyo ba yan o hindi?',
        choices: [
          {
            text: 'Thank you for the photo - malaking tulong po yan sa report. I am filing this with logistics today and I will call you back before 5 PM with the replacement schedule.',
            verdict: 'best',
            feedback:
              'Specific action, specific deadline, and the photo is acknowledged as useful rather than demanded as proof.',
          },
          {
            text: 'Yes po, ipapalit namin lahat, libre, ngayon din.',
            verdict: 'poor',
            feedback:
              'You are not authorised to approve replacements on the spot. Promising one you cannot deliver turns one angry call into two.',
          },
          {
            text: 'Kailangan ko po munang i-check sa team. Mag-message na lang po kayo ulit.',
            verdict: 'ok',
            feedback:
              'Checking with the team is correct, but the customer must never be the one to follow up. Own the callback and give a time.',
          },
        ],
      },
    ],
  },
  {
    id: 'sc-busy-callback',
    slug: 'busy-customer-callback',
    title: 'Thirty Seconds of Attention',
    channel: 'phone',
    personality: 'busy',
    difficulty: 'foundation',
    setup: 'A warm lead who submitted an inquiry yesterday picks up, but is clearly in the middle of something.',
    goal: 'Secure a specific callback time in under thirty seconds without pitching.',
    coaching: ['Do not pitch.', 'Offer two concrete options.', 'Confirm out loud and get off the phone.'],
    turns: [
      {
        id: 'sc-busy-t1',
        customer: 'Sorry, busy ako ngayon, may kausap ako.',
        choices: [
          {
            text: 'Naku, understood po - I will keep this short. Would it be better if I call you back later today, or tomorrow morning?',
            verdict: 'best',
            feedback:
              'Respects the interruption and offers two specific options. "Anytime" gets you nothing.',
          },
          {
            text: 'Sandali lang po, one minute lang - about sa Kangkong Chips reseller package…',
            verdict: 'poor',
            feedback:
              'Pushing through a stated "busy" is the fastest way to lose a warm lead. They will not buy from someone who ignores them.',
          },
          {
            text: 'Sige po, tawag na lang po kayo kapag free na kayo.',
            verdict: 'poor',
            feedback:
              'The agent always owns the callback. Handing it to the customer means it never happens.',
          },
        ],
      },
      {
        id: 'sc-busy-t2',
        customer: 'Bukas na lang, umaga.',
        choices: [
          {
            text: 'Perfect. I will call you at 9 AM tomorrow. Thank you po, Ms. Rivera!',
            verdict: 'best',
            feedback: 'Converts a vague "umaga" into a specific time, confirms it, and ends the call quickly.',
          },
          {
            text: 'Sige po, bukas ng umaga. Salamat!',
            verdict: 'ok',
            feedback:
              '"Umaga" is not a time. Without a specific hour you will call when they are busy again.',
          },
        ],
      },
    ],
  },
  {
    id: 'sc-send-details',
    slug: 'send-details-cold-inquiry',
    title: '"Send Details Po"',
    channel: 'chat',
    personality: 'send-details',
    difficulty: 'foundation',
    setup: 'A new page message arrives with three words and no context.',
    goal: 'Qualify with one question before sending anything, then present the matching package.',
    coaching: ['Ask before you send.', 'One question, not four.', 'Match the package to their answer.'],
    turns: [
      {
        id: 'sc-sd-t1',
        customer: 'Send details po',
        choices: [
          {
            text: 'Sure po! 😊 Before I send - are you planning to sell online, sa physical store, or for personal use? Para po ma-send ko yung tamang details.',
            verdict: 'best',
            feedback:
              'One qualifying question, a reason for asking, and a friendly tone. This is the G.A.L.P.H.C.F.R. "Ask" step.',
          },
          {
            text: '[sends full price list, all flavours, all promos, delivery matrix]',
            verdict: 'poor',
            feedback:
              'A generic dump gets skimmed and ignored. You also lose the chance to learn anything about the lead.',
          },
          {
            text: 'Sure po.',
            verdict: 'poor',
            feedback: 'A one-word reply that sends nothing and asks nothing. The conversation dies here.',
          },
        ],
      },
      {
        id: 'sc-sd-t2',
        customer: 'Online po, sa FB. First time ko po magtinda.',
        choices: [
          {
            text: 'Perfect po! Since online at first time, the starter pack is the best fit - 50 packs, delivery included sa Metro Manila, plus product photos at captions na pwede niyo agad i-post. Gusto niyo po bang i-reserve ko para sa Friday?',
            verdict: 'best',
            feedback:
              'Present tied to their exact answer, followed by a small dated close. Textbook P and C.',
          },
          {
            text: 'Okay po. Ito po ang price list namin sa lahat ng packages.',
            verdict: 'ok',
            feedback:
              'You asked a good question and then ignored the answer. Recommend one package, not the whole menu.',
          },
        ],
      },
    ],
  },
  {
    id: 'sc-cheap-price',
    slug: 'cheap-customer-price-loop',
    title: 'Everything Comes Back to Price',
    channel: 'objection',
    personality: 'cheap',
    difficulty: 'intermediate',
    setup: 'The lead has the details and keeps returning to the price no matter what you say.',
    goal: 'Run A.C.A.C. properly instead of discounting or arguing.',
    coaching: ['Do not discount.', 'Clarify which kind of "expensive" this is.', 'Close on a computation, not a plea.'],
    turns: [
      {
        id: 'sc-cheap-t1',
        customer: 'Ang mahal naman po. May mas mura ba kayo?',
        choices: [
          {
            text: 'I understand po. May I ask - mahal po ba compared sa budget niyo, or compared sa ibang supplier na nakita niyo?',
            verdict: 'best',
            feedback: 'Acknowledge then clarify. These are two different objections needing two different answers.',
          },
          {
            text: 'Hindi po mahal yan ma’am, sulit po talaga.',
            verdict: 'poor',
            feedback: 'Telling a customer their judgement is wrong. You will not win this argument.',
          },
          {
            text: 'Pwede po kitang bigyan ng discount, ma’am.',
            verdict: 'poor',
            feedback:
              'You are not authorised to discount, and offering one teaches every future customer to push for it.',
          },
        ],
      },
      {
        id: 'sc-cheap-t2',
        customer: 'Sa budget po. Konti lang talaga pera ko pang-simula.',
        choices: [
          {
            text: 'Naiintindihan ko po. Kaya nga po mababa ang minimum namin - ang starter pack ang pinakamaliit na order, at kasama na ang delivery. Gusto niyo po bang i-compute natin ang per-pack cost para makita niyo kung kasya sa budget niyo?',
            verdict: 'best',
            feedback:
              'Addresses the budget version specifically and closes on a small, non-threatening next step.',
          },
          {
            text: 'Sige po, pwede kayo mag-hulugan.',
            verdict: 'poor',
            feedback:
              'Instalment terms require Finance approval in writing. Never invent payment schemes.',
          },
          {
            text: 'Yun na po ang pinakamura naming presyo.',
            verdict: 'ok',
            feedback:
              'True but unhelpful - it ends the conversation. Reframe around the low minimum instead.',
          },
        ],
      },
    ],
  },
  {
    id: 'sc-confused',
    slug: 'confused-customer-clarity',
    title: 'Asking the Same Thing Three Ways',
    channel: 'chat',
    personality: 'confused',
    difficulty: 'intermediate',
    setup: 'The lead has read the details but keeps mixing up the minimum order and the price per pack.',
    goal: 'Simplify without condescending, and confirm understanding before closing.',
    coaching: ['One idea per message.', 'Never say "sabi na sa post".', 'Confirm with a question they can answer.'],
    turns: [
      {
        id: 'sc-conf-t1',
        customer: 'Ay so 200 po lahat? Tapos 50 packs? Pero magkano po yung isa? Nalilito po ako.',
        choices: [
          {
            text: 'No worries po, i-simple ko 😊 ₱200 po ang isang pack. Ang pinakamaliit na order ay 50 packs. So 50 × ₱200 = ₱10,000 po ang total. Malinaw po ba?',
            verdict: 'best',
            feedback:
              'Breaks it into one fact per line, shows the arithmetic, and confirms with a question they can answer yes to.',
          },
          {
            text: 'Nakalagay po sa details na sinend ko, ma’am.',
            verdict: 'poor',
            feedback: 'Dismissive, and it does not answer the question. The customer will leave.',
          },
          {
            text: '₱200/pack, MOQ 50, total ₱10k po.',
            verdict: 'ok',
            feedback:
              'Correct but compressed with jargon - "MOQ" means nothing to a first-time reseller who is already confused.',
          },
        ],
      },
    ],
  },
  {
    id: 'sc-seen-zone',
    slug: 'seen-zone-follow-up',
    title: 'Read, Not Replied',
    channel: 'chat',
    personality: 'seen-zone',
    difficulty: 'intermediate',
    setup: 'You sent complete details 24 hours ago. The message shows as seen. Nothing since.',
    goal: 'Send one follow-up that adds value - and know when to stop.',
    coaching: ['A follow-up must add something.', 'Two maximum.', 'No guilt, no false urgency.'],
    turns: [
      {
        id: 'sc-seen-t1',
        customer: '[seen · no reply · 24 hours]',
        choices: [
          {
            text: 'Hi Ms. Rivera! 😊 Following up po. Ito pala yung sample photos na pwede niyo i-post pag nagsimula na kayo. Nandito lang po ako kung may tanong - no rush po.',
            verdict: 'best',
            feedback: 'Adds a genuinely useful asset and explicitly removes pressure. This is what a follow-up is for.',
          },
          { text: 'Po? 😊', verdict: 'poor', feedback: 'Adds nothing and reads as nagging. This is the message that gets pages muted.' },
          {
            text: 'Ma’am, last stock na po ngayon, baka maubos!',
            verdict: 'poor',
            feedback: 'False urgency is prohibited. If it is not literally true, you may not say it.',
          },
        ],
      },
      {
        id: 'sc-seen-t2',
        customer: '[seen · still no reply · 3 days later]',
        choices: [
          {
            text: 'Send one final message with a genuine update (restock or new flavour), then log the lead as cold.',
            verdict: 'best',
            feedback: 'Two value-adding follow-ups, then stop and report. Exactly what the F and R steps require.',
          },
          {
            text: 'Keep messaging every day until they answer.',
            verdict: 'poor',
            feedback: 'This gets the page reported and costs far more than one lost lead.',
          },
          {
            text: 'Call their number instead, three times.',
            verdict: 'poor',
            feedback: 'Escalating channels after silence reads as pressure, not service.',
          },
        ],
      },
    ],
  },
  {
    id: 'sc-curious',
    slug: 'curious-customer-questions',
    title: 'Twenty Questions',
    channel: 'chat',
    personality: 'curious',
    difficulty: 'advanced',
    setup: 'An engaged lead who asks detailed questions - including two you cannot answer without checking.',
    goal: 'Answer what you know, verify what you do not, and still reach a close.',
    coaching: ['Never guess on shelf life, ingredients, or permits.', 'Group answers.', 'Close even while a question is pending.'],
    turns: [
      {
        id: 'sc-cur-t1',
        customer:
          'Ilang months po ang shelf life? May FDA po ba kayo? Anong oil ang gamit? Pwede po ba mag-request ng sample?',
        choices: [
          {
            text: 'Great questions po 😊 Sample requests - yes, let me check availability for your area. Sa shelf life at FDA documentation, I want to give you the exact details, so let me verify with our team and send them to you today. Ano po pala ang area niyo, para ma-check ko agad ang sample?',
            verdict: 'best',
            feedback:
              'Answers what is answerable, refuses to guess on the regulated details, commits to a time, and keeps the conversation moving with a question.',
          },
          {
            text: 'Mga 6 months po siguro, at oo may FDA po kami. Vegetable oil po.',
            verdict: 'poor',
            feedback:
              'Three guesses about shelf life, regulatory status, and ingredients. This is the single most dangerous thing an agent can do.',
          },
          {
            text: 'Sa post po lahat ng info ma’am.',
            verdict: 'poor',
            feedback: 'Dismissive to the most engaged lead you will get all week.',
          },
        ],
      },
    ],
  },
  {
    id: 'sc-funny',
    slug: 'funny-customer-steering',
    title: 'Everything Is a Joke',
    channel: 'chat',
    personality: 'funny',
    difficulty: 'intermediate',
    setup: 'A friendly lead who jokes about everything and never quite answers a question.',
    goal: 'Match the warmth, then steer back to one concrete question.',
    coaching: ['Laugh briefly, then redirect.', 'One question at a time.', 'Do not become the comedian.'],
    turns: [
      {
        id: 'sc-funny-t1',
        customer: 'Kangkong chips? Baka maging kalabaw ako niyan hahaha 🤣',
        choices: [
          {
            text: 'Hahaha promise po, tao pa rin kayo after 😄 Pero seryoso po - balak niyo po bang ibenta or for personal lang?',
            verdict: 'best',
            feedback: 'Matches the energy in one line, then redirects with a single clear question.',
          },
          {
            text: 'Hindi po, ligtas po yan, vegetable lang naman po.',
            verdict: 'poor',
            feedback: 'Answering a joke literally kills the rapport they were offering you.',
          },
          {
            text: 'HAHAHA good one po! 🤣🤣🤣 Ako din po nung una akala ko ganun din 😂😂',
            verdict: 'poor',
            feedback:
              'Over-matching the joke costs you the thread. Warmth is a bridge to the question, not the destination.',
          },
        ],
      },
    ],
  },
  {
    id: 'sc-sleepy',
    slug: 'sleepy-customer-energy',
    title: 'Low Energy on the Line',
    channel: 'phone',
    personality: 'sleepy',
    difficulty: 'foundation',
    setup: 'The lead answers in single syllables and sounds like they just woke up.',
    goal: 'Keep it short, raise your own energy slightly, and get one clear commitment.',
    coaching: ['Do not mirror low energy.', 'Shorter sentences.', 'Offer a callback rather than pushing.'],
    turns: [
      {
        id: 'sc-sleepy-t1',
        customer: 'Mm... oo... ano nga ulit yun?',
        choices: [
          {
            text: 'Sorry po for the disturbance! Ito lang po - yung inquiry niyo sa KCO reseller pack. Mas okay po ba kung tawagan ko kayo mamaya ng hapon?',
            verdict: 'best',
            feedback:
              'Recognises the moment, restates the purpose in one line, and offers a better time rather than pushing through.',
          },
          {
            text: '[repeats the full pitch from the beginning, slowly]',
            verdict: 'poor',
            feedback: 'A longer pitch into low attention gets absorbed even less. Shorten, do not slow down.',
          },
          {
            text: 'Yung Kangkong Chips po, gusto niyo po ba mag-order?',
            verdict: 'ok',
            feedback:
              'Short is right, but closing on someone who is barely awake produces a "yes" that evaporates by afternoon.',
          },
        ],
      },
    ],
  },
]

export const scenarioBySlug = (slug: string) => practiceScenarios.find((s) => s.slug === slug)
