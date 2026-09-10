import type { ContentBlock } from '@/types'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

/**
 * Editing form for a single block. Every branch mirrors a case in
 * `BlockRenderer` - the two switch statements are the contract between
 * authoring and reading.
 */
export function BlockEditor({
  block,
  onChange,
}: {
  block: ContentBlock
  onChange: (next: ContentBlock) => void
}) {
  const patch = (fields: Partial<ContentBlock>) => onChange({ ...block, ...fields } as ContentBlock)

  switch (block.type) {
    case 'heading':
      return (
        <div className="grid grid-cols-1 gap-snug sm:grid-cols-[100px_minmax(0,1fr)]">
          <Field label="Level">
            <Select
              value={String(block.level)}
              onValueChange={(v) => patch({ level: Number(v) as 2 | 3 })}
              options={[
                { value: '2', label: 'H2' },
                { value: '3', label: 'H3' },
              ]}
              className="w-full"
            />
          </Field>
          <Field label="Text">
            <Input value={block.text} onChange={(e) => patch({ text: e.target.value })} />
          </Field>
        </div>
      )

    case 'text':
      return (
        <Field label="Paragraph">
          <Textarea value={block.text} onChange={(e) => patch({ text: e.target.value })} rows={4} />
        </Field>
      )

    case 'bullets':
    case 'numbered':
      return (
        <StringList
          label={block.type === 'bullets' ? 'Bullet points' : 'Numbered steps'}
          items={block.items}
          onChange={(items) => patch({ items })}
        />
      )

    case 'checklist':
      return (
        <div className="space-y-tight">
          <p className="text-sm font-medium text-fg">Checklist items</p>
          {block.items.map((item, i) => (
            <div key={i} className="flex gap-tight">
              <Input
                value={item.text}
                placeholder="Item"
                onChange={(e) => {
                  const items = [...block.items]
                  items[i] = { ...items[i]!, text: e.target.value }
                  patch({ items })
                }}
              />
              <Input
                value={item.hint ?? ''}
                placeholder="Hint (optional)"
                onChange={(e) => {
                  const items = [...block.items]
                  items[i] = { ...items[i]!, hint: e.target.value }
                  patch({ items })
                }}
              />
              <RemoveButton
                label={`Remove item ${i + 1}`}
                onClick={() => patch({ items: block.items.filter((_, x) => x !== i) })}
              />
            </div>
          ))}
          <AddButton label="Add item" onClick={() => patch({ items: [...block.items, { text: '' }] })} />
        </div>
      )

    case 'callout':
      return (
        <div className="space-y-snug">
          <div className="grid grid-cols-1 gap-snug sm:grid-cols-[140px_minmax(0,1fr)]">
            <Field label="Variant">
              <Select
                value={block.variant}
                onValueChange={(v) => patch({ variant: v as typeof block.variant })}
                options={[
                  { value: 'info', label: 'Info' },
                  { value: 'success', label: 'Success' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'danger', label: 'Danger' },
                ]}
                className="w-full"
              />
            </Field>
            <Field label="Title">
              <Input value={block.title ?? ''} onChange={(e) => patch({ title: e.target.value })} />
            </Field>
          </div>
          <Field label="Body">
            <Textarea value={block.text} onChange={(e) => patch({ text: e.target.value })} rows={3} />
          </Field>
        </div>
      )

    case 'dosdonts':
      return (
        <div className="grid grid-cols-1 gap-snug sm:grid-cols-2">
          <StringList label="Do" items={block.dos} onChange={(dos) => patch({ dos })} />
          <StringList label="Don't" items={block.donts} onChange={(donts) => patch({ donts })} />
        </div>
      )

    case 'script':
      return (
        <div className="space-y-snug">
          <div className="grid grid-cols-1 gap-snug sm:grid-cols-2">
            <Field label="Label">
              <Input value={block.label ?? ''} onChange={(e) => patch({ label: e.target.value })} />
            </Field>
            <Field label="Language">
              <Select
                value={block.language}
                onValueChange={(v) => patch({ language: v as typeof block.language })}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'fil', label: 'Filipino' },
                  { value: 'mixed', label: 'Taglish' },
                ]}
                className="w-full"
              />
            </Field>
          </div>
          <StringList label="Lines" items={block.lines} onChange={(lines) => patch({ lines })} />
        </div>
      )

    case 'comparison':
      return (
        <div className="space-y-snug">
          <div className="grid grid-cols-1 gap-snug sm:grid-cols-2">
            <Field label="Left column">
              <Input
                value={block.columns[0]}
                onChange={(e) => patch({ columns: [e.target.value, block.columns[1]] })}
              />
            </Field>
            <Field label="Right column">
              <Input
                value={block.columns[1]}
                onChange={(e) => patch({ columns: [block.columns[0], e.target.value] })}
              />
            </Field>
          </div>
          <p className="text-sm font-medium text-fg">Rows</p>
          {block.rows.map((row, i) => (
            <div key={i} className="flex gap-tight">
              <Input
                value={row[0]}
                placeholder={block.columns[0]}
                onChange={(e) => {
                  const rows = [...block.rows]
                  rows[i] = [e.target.value, row[1]]
                  patch({ rows })
                }}
              />
              <Input
                value={row[1]}
                placeholder={block.columns[1]}
                onChange={(e) => {
                  const rows = [...block.rows]
                  rows[i] = [row[0], e.target.value]
                  patch({ rows })
                }}
              />
              <RemoveButton
                label={`Remove row ${i + 1}`}
                onClick={() => patch({ rows: block.rows.filter((_, x) => x !== i) })}
              />
            </div>
          ))}
          <AddButton label="Add row" onClick={() => patch({ rows: [...block.rows, ['', '']] })} />
          <Field label="Caption">
            <Input value={block.caption ?? ''} onChange={(e) => patch({ caption: e.target.value })} />
          </Field>
        </div>
      )

    case 'formula':
      return (
        <div className="space-y-snug">
          <Field label="Formula name">
            <Input value={block.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <p className="text-sm font-medium text-fg">Steps</p>
          {block.steps.map((step, i) => (
            <div key={i} className="flex gap-tight">
              <Input
                value={step.key}
                placeholder="A"
                className="w-14"
                onChange={(e) => {
                  const steps = [...block.steps]
                  steps[i] = { ...step, key: e.target.value }
                  patch({ steps })
                }}
              />
              <Input
                value={step.label}
                placeholder="Label"
                className="w-40"
                onChange={(e) => {
                  const steps = [...block.steps]
                  steps[i] = { ...step, label: e.target.value }
                  patch({ steps })
                }}
              />
              <Input
                value={step.detail}
                placeholder="Detail"
                onChange={(e) => {
                  const steps = [...block.steps]
                  steps[i] = { ...step, detail: e.target.value }
                  patch({ steps })
                }}
              />
              <RemoveButton
                label={`Remove step ${i + 1}`}
                onClick={() => patch({ steps: block.steps.filter((_, x) => x !== i) })}
              />
            </div>
          ))}
          <AddButton
            label="Add step"
            onClick={() => patch({ steps: [...block.steps, { key: '', label: '', detail: '' }] })}
          />
        </div>
      )

    case 'scenario':
      return (
        <div className="space-y-snug">
          <Field label="Customer">
            <Input value={block.customer} onChange={(e) => patch({ customer: e.target.value })} />
          </Field>
          <Field label="What they say">
            <Textarea value={block.situation} onChange={(e) => patch({ situation: e.target.value })} rows={2} />
          </Field>
          <Field label="Your response">
            <Textarea value={block.response} onChange={(e) => patch({ response: e.target.value })} rows={3} />
          </Field>
          <Field label="Why it works">
            <Textarea value={block.why} onChange={(e) => patch({ why: e.target.value })} rows={2} />
          </Field>
        </div>
      )

    case 'quote':
      return (
        <div className="space-y-snug">
          <Field label="Quote">
            <Textarea value={block.text} onChange={(e) => patch({ text: e.target.value })} rows={2} />
          </Field>
          <Field label="Attribution">
            <Input value={block.attribution ?? ''} onChange={(e) => patch({ attribution: e.target.value })} />
          </Field>
        </div>
      )

    case 'quiz':
      return (
        <div className="space-y-snug">
          <Field label="Question">
            <Textarea value={block.question} onChange={(e) => patch({ question: e.target.value })} rows={2} />
          </Field>
          <p className="text-sm font-medium text-fg">Options - select the correct answer</p>
          {block.options.map((o, i) => (
            <div key={i} className="flex items-center gap-tight">
              <input
                type="radio"
                name={`${block.id}-answer`}
                checked={block.answerIndex === i}
                onChange={() => patch({ answerIndex: i })}
                aria-label={`Mark option ${i + 1} correct`}
                className="size-4 accent-[var(--primary)]"
              />
              <Input
                value={o}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                onChange={(e) => {
                  const options = [...block.options]
                  options[i] = e.target.value
                  patch({ options })
                }}
              />
              <RemoveButton
                label={`Remove option ${i + 1}`}
                disabled={block.options.length <= 2}
                onClick={() =>
                  patch({
                    options: block.options.filter((_, x) => x !== i),
                    answerIndex: Math.min(block.answerIndex, block.options.length - 2),
                  })
                }
              />
            </div>
          ))}
          <AddButton label="Add option" onClick={() => patch({ options: [...block.options, ''] })} />
          <Field label="Explanation" hint="Shown after the learner answers.">
            <Textarea value={block.explanation} onChange={(e) => patch({ explanation: e.target.value })} rows={2} />
          </Field>
        </div>
      )

    case 'wording':
      return (
        <div className="space-y-tight">
          <p className="text-sm font-medium text-fg">Avoid / Use pairs</p>
          {block.pairs.map((pair, i) => (
            <div key={i} className="flex gap-tight">
              <Input
                value={pair.avoid}
                placeholder="Avoid"
                onChange={(e) => {
                  const pairs = [...block.pairs]
                  pairs[i] = { ...pair, avoid: e.target.value }
                  patch({ pairs })
                }}
              />
              <Input
                value={pair.use}
                placeholder="Use"
                onChange={(e) => {
                  const pairs = [...block.pairs]
                  pairs[i] = { ...pair, use: e.target.value }
                  patch({ pairs })
                }}
              />
              <RemoveButton
                label={`Remove pair ${i + 1}`}
                onClick={() => patch({ pairs: block.pairs.filter((_, x) => x !== i) })}
              />
            </div>
          ))}
          <AddButton label="Add pair" onClick={() => patch({ pairs: [...block.pairs, { avoid: '', use: '' }] })} />
        </div>
      )

    case 'activity':
      return (
        <p className="text-base text-fg-secondary">
          Linked training activity. Manage the activity itself under Training → Activities.
        </p>
      )
  }
}

function StringList({
  label,
  items,
  onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div className="space-y-tight">
      <p className="text-sm font-medium text-fg">{label}</p>
      {items.map((item, i) => (
        <div key={i} className="flex gap-tight">
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
          />
          <RemoveButton label={`Remove ${label} item ${i + 1}`} onClick={() => onChange(items.filter((_, x) => x !== i))} />
        </div>
      ))}
      <AddButton label={`Add to ${label.toLowerCase()}`} onClick={() => onChange([...items, ''])} />
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="xs" icon={<Plus className="size-3" />} onClick={onClick}>
      {label}
    </Button>
  )
}

function RemoveButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
      <X className="size-3.5" />
    </Button>
  )
}
