import type { Objection } from '@/types'

/**
 * Module 5 - Objection Handling.
 * Every card maps to A.C.A.C. Cards touching earnings carry `claimSensitive`,
 * which the UI surfaces as an "illustrative only" notice (§25 guardrail).
 */
export const objections: Objection[] = [
  {
    id: 'obj-mahal',
    slug: 'mahal-naman',
    objection: 'Mahal naman.',
    translation: 'That is expensive.',
    category: 'price',
    frequency: 'very-high',
    acknowledge:
      'I understand po. Importante talaga na sulit ang bawat piso, especially kung negosyo ang pag-uusapan.',
    clarify:
      'May I ask - mahal po ba compared sa budget niyo ngayon, or compared sa ibang supplier na nakita niyo?',
    address:
      'Kung budget po ang concern: ang starter pack ang pinakamaliit na order namin, kaya mababa ang unang commitment niyo. Kung comparison po sa iba: ang presyo namin ay kasama na ang delivery sa Metro Manila, ang packaging na ready for resale, at ang marketing materials na pwede niyo agad gamitin. Hindi lang po chips ang binabayaran niyo - kasama na ang support para makapagsimula kayo.',
    close:
      'Gusto niyo po bang i-compute natin ang per-pack cost para makita niyo kung saan papasok ang selling price niyo?',
    pitfalls: [
      'Do not immediately offer a discount - you probably cannot authorise it, and it teaches the customer to wait for one.',
      'Do not argue that it is "not expensive". You are telling them their judgement is wrong.',
      'Do not compare KCO to a named competitor.',
    ],
    claimSensitive: false,
  },
  {
    id: 'obj-hindi-mabenta',
    slug: 'baka-hindi-ko-mabenta',
    objection: 'Baka hindi ko mabenta.',
    translation: 'I might not be able to sell it.',
    category: 'risk',
    frequency: 'very-high',
    acknowledge:
      'Valid po yan, Ms. Rivera. Normal lang mag-alala sa unang order - ayaw naman po natin ma-stuck kayo sa stock.',
    clarify:
      'May I ask po - ano ang mas kinakabahan niyo, ang paghahanap ng buyers or ang dami ng stock?',
    address:
      'Dahil dyan po kami nag-set ng mababang minimum. Sa starter pack, sapat lang po para ma-test niyo kung aling flavour ang mabilis mauubos sa area niyo, hindi yung malaking stock na mahirap ilipat. Bibigyan din po namin kayo ng product photos, captions, at basic selling guide para hindi kayo magsimula sa zero. At kung nauubos po agad, mabilis lang ang resupply.',
    close:
      'Gusto niyo po bang simulan natin sa pinakamaliit na pack, para test muna, then dagdagan natin pag okay na?',
    pitfalls: [
      'Never promise that the stock will definitely sell.',
      'Do not dismiss the fear - it is the most reasonable objection on this list.',
      'Do not push a larger pack to hit a quota.',
    ],
    claimSensitive: false,
  },
  {
    id: 'obj-pag-iisipan',
    slug: 'pag-isipan-ko-muna',
    objection: 'Pag-isipan ko muna.',
    translation: 'Let me think about it first.',
    category: 'timing',
    frequency: 'very-high',
    acknowledge: 'Of course po - dapat lang na pag-isipan ang anumang investment. Take your time.',
    clarify:
      'May I ask lang po, para matulungan ko kayo - ano pong part ang pinag-iisipan niyo? Yung presyo, yung pagbebenta, or kailangan niyo pang kausapin ang partner niyo?',
    address:
      'Kung presyo po: pwede natin i-break down ang cost per pack. Kung pagbebenta po: may guide kami kung paano magsimula online. Kung may kausapin pa po kayo, i-send ko na lang ang complete details para may maipakita kayo - kasama na ang inclusions at delivery schedule.',
    close:
      'I-send ko po ang details ngayon. Pwede po ba akong mag-follow up bukas ng hapon para sagutin ang mga tanong niyo?',
    pitfalls: [
      'Do not ask "why?" bluntly - it reads as a challenge.',
      'Do not invent urgency ("last stock na po") that is not real.',
      'Do not ask for the sale again in the same breath.',
    ],
    claimSensitive: false,
  },
  {
    id: 'obj-walang-experience',
    slug: 'wala-akong-experience',
    objection: 'Wala akong experience sa negosyo.',
    translation: 'I have no business experience.',
    category: 'capability',
    frequency: 'high',
    acknowledge:
      'Naiintindihan ko po. Marami sa mga reseller namin ay first-timers din nung nagsimula sila.',
    clarify: 'May I ask po - nakapag-sell na po ba kayo online kahit personal items lang, or talagang first time?',
    address:
      'Hindi po kailangan ng business background para dito. Ang binibigay namin ay ang produkto, ang product photos, ready-to-use captions, at isang simpleng guide kung paano mag-post at sumagot sa tanong ng customer. Ang kailangan lang po sa umpisa ay isang Facebook account at willingness mag-reply sa mga tanong. Meron din po kaming reseller support kung may hindi kayo sigurado.',
    close:
      'Gusto niyo po bang i-send ko yung starter guide para makita niyo mismo kung gaano kasimple ang proseso?',
    pitfalls: [
      'Do not say "madali lang yan" - it minimises a real worry.',
      'Do not promise hand-holding that the team cannot actually deliver.',
    ],
    claimSensitive: false,
  },
  {
    id: 'obj-walang-store',
    slug: 'wala-akong-physical-store',
    objection: 'Wala akong physical store.',
    translation: 'I do not have a physical store.',
    category: 'capability',
    frequency: 'high',
    acknowledge: 'Okay lang po yan - hindi po requirement ang physical store para maging KCO reseller.',
    clarify: 'May I ask po - active po ba kayo sa Facebook or Messenger? Yun po ang pinakamadaling simulan.',
    address:
      'Malaking parte po ng mga reseller namin ay online lang - Facebook posts, Messenger orders, at meet-up or delivery. Walang rent, walang display shelf. Bibigyan po namin kayo ng photos at captions na pwede niyo agad i-post, at may packaging na kayang i-ship. Kung may sari-sari store naman po ang kakilala niyo, pwede rin kayo mag-supply sa kanila.',
    close: 'Gusto niyo po bang i-set up natin ang online starter pack para sa inyo?',
    pitfalls: ['Do not imply an online seller is a lesser reseller.', 'Do not promise delivery coverage you have not checked.'],
    claimSensitive: false,
  },
  {
    id: 'obj-marami-nagbebenta',
    slug: 'marami-nang-nagbebenta',
    objection: 'Marami nang nagbebenta ng Kangkong Chips.',
    translation: 'A lot of people already sell Kangkong Chips.',
    category: 'competition',
    frequency: 'high',
    acknowledge: 'Tama po kayo - sumikat talaga ang kangkong chips, kaya marami ang nag-offer.',
    clarify:
      'May I ask po - nakita niyo po ba kung ano ang binebenta nila sa area niyo, at magkano?',
    address:
      'Dalawa po ang pinag-iba namin. Isa, ang produkto: consistent ang crunch at packaging namin, at may proper labeling - hindi repacked. Dalawa, ang support: bibigyan namin kayo ng marketing materials at reseller pricing na hindi lang basta paubos ng stock. Ang mataas na demand po ay hindi problema - ibig sabihin may market na. Ang mahalaga ay kayo ang may maayos na supply at presentation.',
    close:
      'Gusto niyo po bang ipakita ko ang product photos at packaging namin para makita niyo ang difference?',
    pitfalls: [
      'Never disparage a named competitor or another reseller.',
      'Do not claim exclusivity or territory rights unless Admin has confirmed them in writing.',
    ],
    claimSensitive: false,
  },
  {
    id: 'obj-may-supplier',
    slug: 'may-supplier-na-ako',
    objection: 'May supplier na ako.',
    translation: 'I already have a supplier.',
    category: 'competition',
    frequency: 'medium',
    acknowledge: 'Mabuti po yan - ibig sabihin alam niyo na ang proseso ng pag-resupply.',
    clarify:
      'May I ask po - kumusta ang supply nila, consistent po ba ang stock at delivery?',
    address:
      'Hindi po namin kailangang palitan ang supplier niyo agad. Ang ginagawa ng ibang reseller ay ginagamit kami as backup - pag out of stock sila or delayed ang delivery, may mapupuntahan kayo agad. Kung mas okay naman po ang terms namin sa tagal ng panahon, kayo na po ang magdedesisyon. Walang exclusivity requirement po sa amin.',
    close:
      'Gusto niyo po bang i-send ko ang pricing namin para may comparison kayo, kahit for reference lang muna?',
    pitfalls: [
      'Do not ask them to break an existing agreement.',
      'Do not ask who their supplier is - it reads as intelligence-gathering.',
      'Do not undercut with a price you cannot honour.',
    ],
    claimSensitive: false,
  },
  {
    id: 'obj-walang-capital',
    slug: 'wala-akong-malaking-capital',
    objection: 'Wala akong malaking capital.',
    translation: 'I do not have a lot of capital.',
    category: 'capital',
    frequency: 'very-high',
    acknowledge: 'Naiintindihan ko po. Hindi po biro ang maglabas ng pera para sa panibagong negosyo.',
    clarify: 'May I ask po - magkano ang comfortable niyong ilabas sa unang order, para makita natin kung kasya?',
    address:
      'Dahil dyan po ang starter pack ang pinakamababang entry namin - yun po ang minimum na order, hindi yung malaking bulk. Ganun din po ang dahilan kung bakit kasama na ang delivery sa Metro Manila, para walang dagdag na gastos sa umpisa. Wala rin pong franchise fee, membership fee, o bayad sa marketing materials.',
    close:
      'Gusto niyo po bang tignan natin ang exact na halaga ng starter pack, para malaman niyo kung kasya sa budget niyo ngayon?',
    pitfalls: [
      'Never suggest borrowing money or offering a loan.',
      'Do not present the purchase as risk-free.',
      'Do not quote an instalment scheme unless Finance has approved one in writing.',
    ],
    claimSensitive: false,
  },
  {
    id: 'obj-matagal-roi',
    slug: 'baka-matagal-ang-roi',
    objection: 'Baka matagal ang ROI.',
    translation: 'The return on investment might take a long time.',
    category: 'risk',
    frequency: 'medium',
    acknowledge: 'Magandang tanong po - dapat lang alam niyo kung kailan bumabalik ang pera niyo.',
    clarify:
      'May I ask po - ilan ang customer na kayang maabot niyo sa isang linggo, at gaano kadalas kayo makakapag-post?',
    address:
      'Maging prangka po tayo: depende po ito sa selling price na ilalagay niyo, sa area niyo, at kung gaano kadalas kayo mag-post o mag-alok. Hindi po namin kayang mangako ng specific na panahon. Ang kaya po naming gawin ay tulungan kayong makuha ang tamang selling price at bigyan kayo ng materials para mas mabilis mag-move ang stock. Kung gusto niyo po, i-compute natin ang break-even base sa sarili niyong numbers - pero example lang po ito, hindi guarantee.',
    close:
      'Gusto niyo po bang i-compute natin nang sabay ang break-even base sa target selling price niyo?',
    pitfalls: [
      'Never state or imply a guaranteed payback period.',
      'Never quote a "typical" ROI figure that Admin has not approved.',
      'Always label any computation as an illustration built from the customer’s own assumptions.',
    ],
    claimSensitive: true,
  },
  {
    id: 'obj-hindi-marunong-online',
    slug: 'hindi-ako-marunong-mag-online-selling',
    objection: 'Hindi ako marunong mag-online selling.',
    translation: 'I do not know how to sell online.',
    category: 'capability',
    frequency: 'high',
    acknowledge: 'Okay lang po yan. Marami sa nagsisimula ay ganun din - natutunan lang nila habang nag-post.',
    clarify: 'May I ask po - gumagamit po ba kayo ng Facebook or Messenger sa araw-araw?',
    address:
      'Kung marunong po kayong mag-post at mag-reply sa Messenger, sapat na po yun para makapagsimula. Bibigyan po namin kayo ng ready na product photos, captions na pwede niyong kopyahin, at simpleng guide kung paano sagutin ang mga karaniwang tanong - presyo, delivery, at flavour. Hindi po kailangan ng website, ads, o technical na kaalaman sa umpisa.',
    close: 'Gusto niyo po bang i-send ko yung starter kit ng photos at captions para makita niyo?',
    pitfalls: ['Do not overwhelm them with ads, SEO, or marketplace jargon.', 'Do not promise training sessions that do not exist.'],
    claimSensitive: false,
  },
  {
    id: 'obj-hindi-patok',
    slug: 'baka-hindi-patok-sa-lugar-namin',
    objection: 'Baka hindi patok sa lugar namin.',
    translation: 'It might not be popular in our area.',
    category: 'market',
    frequency: 'medium',
    acknowledge: 'Fair po yan - magkaiba talaga ang nagpapatok sa bawat lugar.',
    clarify:
      'May I ask po - saan po banda kayo, at ano ang uso pong snack sa area niyo ngayon?',
    address:
      'Ang pinakamurang paraan po para malaman ay maliit na test order. Yun ang dahilan kung bakit mababa ang minimum namin - para hindi kayo mag-commit sa malaking stock bago malaman kung tatanggapin sa area niyo. Nakakatulong din po na healthier snack ang positioning ng kangkong chips, kaya kadalasan may market sa mga school, office, at sari-sari store. Pero test order po ang magsasabi, hindi ang assumption natin.',
    close: 'Gusto niyo po bang simulan sa isang starter pack as test para sa area niyo?',
    pitfalls: [
      'Do not claim the product "always sells" anywhere.',
      'Do not cite sales figures from another area as a promise.',
    ],
    claimSensitive: true,
  },
  {
    id: 'obj-magkano-kita',
    slug: 'magkano-ang-kita-ko',
    objection: 'Magkano ang kita ko?',
    translation: 'How much will I earn?',
    category: 'price',
    frequency: 'very-high',
    acknowledge: 'Magandang tanong po - dapat lang malinaw ito bago kayo mag-order.',
    clarify:
      'May I ask po - magkano ang balak niyong ipagbenta per pack sa area niyo?',
    address:
      'Ang kita po ay ang pagitan ng reseller price niyo at ng selling price na ilalagay niyo, less ang gastos niyo sa delivery o packaging. Ibibigay po namin ang exact reseller price at ang suggested retail range, pero kayo po ang magdedesisyon sa final selling price niyo. Hindi po namin kayang mangako ng specific na kita - nakadepende po ito sa presyo niyo, sa dami ng mabebenta, at sa area niyo.',
    close:
      'Gusto niyo po bang i-compute natin ang margin base sa selling price na naiisip niyo, para may malinaw kayong number?',
    pitfalls: [
      'Never guarantee an income figure, monthly or otherwise.',
      'Never repeat another reseller’s earnings as an expected result.',
      'Always frame computations as the customer’s own numbers, clearly marked as an example.',
    ],
    claimSensitive: true,
  },
]

export const objectionCategoryLabels: Record<Objection['category'], string> = {
  price: 'Price',
  risk: 'Risk',
  capability: 'Capability',
  competition: 'Competition',
  capital: 'Capital',
  timing: 'Timing',
  market: 'Market',
}
