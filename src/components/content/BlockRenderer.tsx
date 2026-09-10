import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Copy, Quote as QuoteIcon, X } from 'lucide-react'
import type { ContentBlock } from '@/types'
import { trainingService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { EmojiText } from '@/components/common/Emoji'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Tooltip } from '@/components/ui/tooltip'
import { IconTile } from '@/components/common/EmojiTile'

/**
 * Renders the `ContentBlock` union. This is the single place that decides what
 * authored content looks like, so the material viewer, quick reference cards,
 * and any future preview all stay identical.
 */
export function Blocks({ blocks, className }: { blocks: ContentBlock[]; className?: string }) {
  return (
    <div className={cn('space-y-group', className)}>
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </div>
  )
}

export function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return block.level === 2 ? (
        <h2 className="pt-tight text-xl font-semibold tracking-tight text-fg">{block.text}</h2>
      ) : (
        <h3 className="pt-hair text-lg font-semibold tracking-tight text-fg">{block.text}</h3>
      )

    case 'text':
      return (
        <p className="max-w-[72ch] text-md leading-[1.65] text-fg-secondary">
          <EmojiText>{block.text}</EmojiText>
        </p>
      )

    case 'bullets':
      return (
        <ul className="max-w-[72ch] space-y-tight">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-tight text-md leading-[1.6] text-fg-secondary">
              <span className="mt-[0.6em] size-1 shrink-0 rounded-full bg-fg-tertiary" aria-hidden />
              <span>
                <EmojiText>{item}</EmojiText>
              </span>
            </li>
          ))}
        </ul>
      )

    case 'numbered':
      return (
        <ol className="max-w-[72ch] space-y-tight">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-tight text-md leading-[1.6] text-fg-secondary">
              <span className="mt-hair flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-subtle text-2xs font-semibold text-fg-secondary tnum">
                {i + 1}
              </span>
              <span>
                <EmojiText>{item}</EmojiText>
              </span>
            </li>
          ))}
        </ol>
      )

    case 'checklist':
      return <ChecklistBlock items={block.items} />

    case 'callout':
      return (
        <Callout variant={block.variant} title={block.title}>
          {block.text}
        </Callout>
      )

    case 'dosdonts':
      return (
        <div className="grid grid-cols-1 gap-group sm:grid-cols-2">
          <ListPanel tone="success" heading="Do" items={block.dos} icon={<Check className="size-3" />} />
          <ListPanel tone="danger" heading="Don't" items={block.donts} icon={<X className="size-3" />} />
        </div>
      )

    case 'script':
      return <ScriptBlock label={block.label} language={block.language} lines={block.lines} />

    case 'comparison':
      return (
        <figure className="overflow-hidden chunk">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-bg-inset">
                {block.columns.map((c) => (
                  <th key={c} className="px-card py-row-y text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-b-0">
                  <td className="w-1/2 px-card py-row-y align-top text-base text-fg-secondary">
                    <EmojiText>{row[0] ?? ''}</EmojiText>
                  </td>
                  <td className="w-1/2 border-l border-line px-card py-row-y align-top text-base text-fg">
                    <EmojiText>{row[1] ?? ''}</EmojiText>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption && (
            <figcaption className="border-t border-line bg-bg-inset px-card py-tight text-2xs text-fg-tertiary">
              {block.caption}
            </figcaption>
          )}
        </figure>
      )

    case 'formula':
      return (
        <div className="chunk p-card">
          <p className="mb-snug text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">{block.name}</p>
          <ol className="space-y-tight">
            {block.steps.map((s, i) => (
              <li key={i} className="flex gap-tight">
                <IconTile tone="primary" size="xs" className="text-sm font-bold">
                  {s.key}
                </IconTile>
                <span className="min-w-0 pt-px">
                  <span className="block text-base font-medium text-fg">{s.label}</span>
                  <span className="mt-hair block text-base leading-[1.55] text-fg-secondary">{s.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )

    case 'scenario':
      return (
        <div className="overflow-hidden chunk">
          <div className="border-b border-line bg-bg-inset px-card py-row-y">
            <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">Scenario</p>
            <p className="mt-hair text-base font-medium text-fg">{block.customer}</p>
          </div>
          <dl className="divide-y divide-[var(--border)]">
            <Row term="Situation">{block.situation}</Row>
            <Row term="Response">
              <span className="text-fg">
                “<EmojiText>{block.response}</EmojiText>”
              </span>
            </Row>
            <Row term="Why it works">{block.why}</Row>
          </dl>
        </div>
      )

    case 'quote':
      return (
        <blockquote className="flex max-w-[68ch] gap-tight border-l-2 border-primary pl-card">
          <QuoteIcon className="mt-hair size-4 shrink-0 text-primary/60" aria-hidden />
          <div>
            <p className="text-md italic leading-[1.6] text-fg">{block.text}</p>
            {block.attribution && <footer className="mt-tight text-sm text-fg-tertiary"> - {block.attribution}</footer>}
          </div>
        </blockquote>
      )

    case 'quiz':
      return <QuizBlock block={block} />

    case 'wording':
      return (
        <div className="overflow-hidden rounded-lg">
          {block.pairs.map((p, i) => (
            <div
              key={i}
              className={cn(
                'grid gap-px bg-[var(--border)] sm:grid-cols-2',
                i > 0 && 'border-t border-line',
              )}
            >
              <div className="space-y-hair bg-surface px-card py-row-y">
                <p className="text-2xs font-semibold uppercase tracking-wider text-danger-fg">Avoid</p>
                <p className="text-base text-fg-secondary line-through decoration-danger/40">
                  <EmojiText>{p.avoid}</EmojiText>
                </p>
              </div>
              <div className="space-y-hair bg-surface px-card py-row-y">
                <p className="text-2xs font-semibold uppercase tracking-wider text-success-fg">Use</p>
                <p className="text-base text-fg">
                  <EmojiText>{p.use}</EmojiText>
                </p>
                {p.note && <p className="text-xs text-fg-tertiary">{p.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )

    case 'activity':
      return <ActivityBlock activityId={block.activityId} />
  }
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-hair px-card py-row-y sm:grid-cols-[120px_1fr] sm:gap-group">
      <dt className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary sm:pt-px">{term}</dt>
      <dd className="text-base leading-[1.6] text-fg-secondary">{children}</dd>
    </div>
  )
}

function ListPanel({
  tone,
  heading,
  items,
  icon,
}: {
  tone: 'success' | 'danger'
  heading: string
  items: string[]
  icon: React.ReactNode
}) {
  return (
    <div className="chunk p-card">
      <p
        className={cn(
          'mb-tight flex items-center gap-tight text-2xs font-semibold uppercase tracking-wider',
          tone === 'success' ? 'text-success-fg' : 'text-danger-fg',
        )}
      >
        <span
          className={cn(
            'flex size-4 items-center justify-center rounded-full text-white',
            tone === 'success' ? 'bg-success' : 'bg-danger',
          )}
          aria-hidden
        >
          {icon}
        </span>
        {heading}
      </p>
      <ul className="space-y-tight">
        {items.map((item, i) => (
          <li key={i} className="text-base leading-[1.55] text-fg-secondary">
            <EmojiText>{item}</EmojiText>
          </li>
        ))}
      </ul>
    </div>
  )
}

const languageLabel = { en: 'English', fil: 'Filipino', mixed: 'Taglish' } as const

function ScriptBlock({
  label,
  language,
  lines,
}: {
  label?: string
  language: 'en' | 'fil' | 'mixed'
  lines: string[]
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked - the text is on screen and selectable anyway */
    }
  }

  return (
    <div className="overflow-hidden chunk">
      <div className="flex items-center gap-tight border-b border-line bg-bg-inset px-card py-tight">
        <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">{label ?? 'Say this'}</p>
        <Badge tone="neutral">{languageLabel[language]}</Badge>
        <Tooltip content={copied ? 'Copied' : 'Copy script'}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={() => void copy()}
            aria-label="Copy script to clipboard"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </Button>
        </Tooltip>
      </div>
      <div className="space-y-tight px-card py-row-y">
        {lines.map((line, i) => (
          <p key={i} className="font-mono text-sm leading-[1.6] text-fg">
            <EmojiText>{line}</EmojiText>
          </p>
        ))}
      </div>
    </div>
  )
}

function ChecklistBlock({ items }: { items: { text: string; hint?: string }[] }) {
  const [done, setDone] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <ul className="max-w-[72ch] space-y-hair">
      {items.map((item, i) => {
        const checked = done.has(i)
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={checked}
              className="flex w-full gap-tight rounded-md px-tight py-tight text-left chunk-press hover:bg-surface-hover"
            >
              <span
                className={cn(
                  'mt-hair flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                  checked ? 'border-primary bg-primary text-primary-fg' : 'border-line-strong bg-surface',
                )}
                aria-hidden
              >
                {checked && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className={cn('block text-base', checked ? 'text-fg-tertiary line-through' : 'text-fg-secondary')}>
                  {item.text}
                </span>
                {item.hint && <span className="mt-hair block text-xs text-fg-tertiary">{item.hint}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function QuizBlock({ block }: { block: Extract<ContentBlock, { type: 'quiz' }> }) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  const correct = picked === block.answerIndex

  return (
    <div className="chunk p-card">
      <p className="mb-snug text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">Check yourself</p>
      <p className="mb-snug text-md font-medium text-fg">{block.question}</p>
      <div className="space-y-tight" role="group" aria-label={block.question}>
        {block.options.map((option, i) => {
          const isAnswer = i === block.answerIndex
          const isPicked = i === picked
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={cn(
                'flex w-full items-start gap-tight rounded-md border px-card py-tight text-left text-base transition-colors',
                !answered && 'border-line bg-surface hover:border-line-strong hover:bg-surface-hover',
                answered && isAnswer && 'border-success bg-success-subtle text-success-fg',
                answered && isPicked && !isAnswer && 'border-danger bg-danger-subtle text-danger-fg',
                answered && !isPicked && !isAnswer && 'border-line text-fg-tertiary',
              )}
            >
              <span className="mt-hair flex size-4 shrink-0 items-center justify-center rounded-full border border-current text-2xs font-semibold">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="mt-snug">
          <Callout variant={correct ? 'success' : 'warning'} title={correct ? 'Correct' : 'Not quite'}>
            {block.explanation}
          </Callout>
          <Button variant="link" size="sm" className="mt-tight" onClick={() => setPicked(null)}>
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * An inline link to a training activity.
 *
 * Looked up through the service rather than the seed file: the block stores
 * only an id, and an activity an admin renamed or archived has to resolve
 * against the database or the card shows stale text - or worse, links to
 * something no longer there.
 *
 * Renders nothing while loading and nothing if the activity is gone, which is
 * the right failure for an optional inline card: a lesson should not sprout a
 * skeleton in the middle of its prose.
 */
function ActivityBlock({ activityId }: { activityId: string }) {
  const { data: activity } = useAsync(() => trainingService.activity(activityId), [activityId])
  if (!activity) return null

  return (
    <Link
      to={`/training/activities/${activity.slug}`}
      className="group flex items-center gap-group chunk p-card chunk-press hover:bg-surface-hover"
    >
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">Training activity</p>
        <p className="mt-hair truncate text-base font-medium text-fg">{activity.title}</p>
        <p className="mt-hair line-clamp-1 text-sm text-fg-secondary">{activity.objective}</p>
      </div>
      <span className="flex items-center gap-hair text-sm text-fg-tertiary transition-colors group-hover:text-primary">
        {activity.durationMinutes} min
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  )
}
