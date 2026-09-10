import type { Category } from '@/types'

export const categories: Category[] = [
  {
    id: 'cat-phone',
    name: 'Phone Skills',
    slug: 'phone-skills',
    description: 'Etiquette, tone, and call handling for outbound and inbound calls.',
    accent: 'green',
    icon: 'speaking',
  },
  {
    id: 'cat-chat',
    name: 'Chat Support',
    slug: 'chat-support',
    description: 'Written support standards for Messenger and page inquiries.',
    accent: 'blue',
    icon: 'chat',
  },
  {
    id: 'cat-process',
    name: 'Sales Process',
    slug: 'sales-process',
    description: 'The structures that carry a conversation from greeting to order.',
    accent: 'violet',
    icon: 'finish',
  },
  {
    id: 'cat-objections',
    name: 'Objection Handling',
    slug: 'objection-handling',
    description: 'The twelve objections KCO agents hear, and how to answer them.',
    accent: 'amber',
    icon: 'muscle',
  },
  {
    id: 'cat-training',
    name: 'Training Activities',
    slug: 'training-activities',
    description: 'Facilitator-led exercises for huddles and training days.',
    accent: 'rose',
    icon: 'grad',
  },
  {
    id: 'cat-reference',
    name: 'Quick Reference',
    slug: 'quick-reference',
    description: 'Scripts, formulas, and wording you need mid-conversation.',
    accent: 'slate',
    icon: 'bolt',
  },
]

export const categoryById = (id: string) => categories.find((c) => c.id === id)
