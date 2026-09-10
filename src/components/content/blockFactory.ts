import type { BlockType, ContentBlock } from '@/types'
import { uid } from '@/lib/id'

/** Human labels and starter content for every block type the editor offers. */
export const blockMeta: Record<BlockType, { label: string; hint: string }> = {
  heading: { label: 'Heading', hint: 'Section subheading' },
  text: { label: 'Text', hint: 'A paragraph of prose' },
  bullets: { label: 'Bullet list', hint: 'Unordered points' },
  numbered: { label: 'Numbered list', hint: 'Ordered steps' },
  checklist: { label: 'Checklist', hint: 'Tickable items with optional hints' },
  callout: { label: 'Callout', hint: 'Highlighted note, warning, or rule' },
  dosdonts: { label: "Do / Don't", hint: 'Two-column comparison of behaviour' },
  script: { label: 'Script', hint: 'Word-for-word lines to say or send' },
  comparison: { label: 'Comparison table', hint: 'Two columns of paired rows' },
  formula: { label: 'Formula', hint: 'Keyed steps such as A.C.A.C.' },
  scenario: { label: 'Scenario', hint: 'Customer situation, response, and why' },
  quote: { label: 'Quote', hint: 'A golden rule or memorable line' },
  quiz: { label: 'Quiz question', hint: 'Multiple choice with an explanation' },
  wording: { label: 'Wording swaps', hint: 'Avoid / Use phrase pairs' },
}

export function createBlock(type: BlockType): ContentBlock {
  const id = uid('blk')
  switch (type) {
    case 'heading':
      return { id, type: 'heading', level: 2, text: 'New heading' }
    case 'text':
      return { id, type: 'text', text: '' }
    case 'bullets':
      return { id, type: 'bullets', items: [''] }
    case 'numbered':
      return { id, type: 'numbered', items: [''] }
    case 'checklist':
      return { id, type: 'checklist', items: [{ text: '' }] }
    case 'callout':
      return { id, type: 'callout', variant: 'info', title: '', text: '' }
    case 'dosdonts':
      return { id, type: 'dosdonts', dos: [''], donts: [''] }
    case 'script':
      return { id, type: 'script', label: 'Script', language: 'mixed', lines: [''] }
    case 'comparison':
      return { id, type: 'comparison', columns: ['Avoid', 'Use'], rows: [['', '']] }
    case 'formula':
      return { id, type: 'formula', name: 'New formula', steps: [{ key: 'A', label: '', detail: '' }] }
    case 'scenario':
      return { id, type: 'scenario', customer: '', situation: '', response: '', why: '' }
    case 'quote':
      return { id, type: 'quote', text: '', attribution: '' }
    case 'quiz':
      return { id, type: 'quiz', question: '', options: ['', ''], answerIndex: 0, explanation: '' }
    case 'wording':
      return { id, type: 'wording', pairs: [{ avoid: '', use: '' }] }
  }
}

/** Deep copy with fresh ids so a duplicated block is genuinely independent. */
export function duplicateBlock(block: ContentBlock): ContentBlock {
  return { ...JSON.parse(JSON.stringify(block)), id: uid('blk') } as ContentBlock
}

export function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

/** Short preview of a block's content for the collapsed editor row. */
export function blockSummary(block: ContentBlock): string {
  switch (block.type) {
    case 'heading':
    case 'text':
      return block.text || 'Empty'
    case 'bullets':
    case 'numbered':
      return block.items.filter(Boolean).join(' · ') || 'Empty list'
    case 'checklist':
      return block.items.map((i) => i.text).filter(Boolean).join(' · ') || 'Empty checklist'
    case 'callout':
      return block.title || block.text || 'Empty callout'
    case 'dosdonts':
      return `${block.dos.filter(Boolean).length} dos · ${block.donts.filter(Boolean).length} don'ts`
    case 'script':
      return block.lines.filter(Boolean)[0] ?? 'Empty script'
    case 'comparison':
      return `${block.columns[0]} vs ${block.columns[1]} · ${block.rows.length} rows`
    case 'formula':
      return `${block.name} · ${block.steps.length} steps`
    case 'scenario':
      return block.customer || 'Empty scenario'
    case 'quote':
      return block.text || 'Empty quote'
    case 'quiz':
      return block.question || 'Empty question'
    case 'wording':
      return `${block.pairs.length} swaps`
    case 'activity':
      return 'Linked activity'
  }
}
