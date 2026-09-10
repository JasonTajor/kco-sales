import { Link } from 'react-router-dom'
import { Check, Lock } from 'lucide-react'
import type { PathNode, PathUnit } from '@/types'
import { cn } from '@/lib/cn'
import { Emoji } from '@/components/common/Emoji'
import { XPBadge } from './Stats'

/**
 * The learner's journey, drawn as a sequence of units.
 *
 * A locked node is guidance about order, not access control: any published
 * material is still reachable from the library, and the database would not
 * refuse it. Locking is how the path says "this one first", which is why a
 * locked node is rendered as a non-interactive marker rather than a link that
 * fails.
 */
export function LearningPathMap({ units }: { units: PathUnit[] }) {
  return (
    <div className="space-y-rhythm">
      {units.map((unit) => (
        <UnitBlock key={unit.id} unit={unit} />
      ))}
    </div>
  )
}

function UnitBlock({ unit }: { unit: PathUnit }) {
  const done = unit.nodes.filter((n) => n.state === 'completed').length

  return (
    <section
      className={cn('chunk p-card', unit.state === 'locked' && 'opacity-75')}
      aria-label={unit.title}
    >
      <header className="flex items-start gap-snug">
        <span
          aria-hidden
          className={cn(
            'flex size-8 flex-none items-center justify-center rounded-lg text-sm font-extrabold',
            unit.state === 'completed'
              ? 'face-chunky [--face:var(--success)]'
              : unit.state === 'current'
                ? 'face-chunky [--face:var(--cta)]'
                : 'bg-locked-subtle text-locked',
          )}
        >
          {unit.state === 'completed' ? <Check className="size-4" /> : unit.index}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-tight">
            <h2 className="text-base font-bold text-fg">{unit.title}</h2>
            <span className="text-2xs font-bold text-fg-tertiary tnum">
              {done}/{unit.nodes.length}
            </span>
          </div>
          <p className="mt-hair text-sm text-fg-secondary">{unit.summary}</p>
        </div>
      </header>

      <ol className="mt-group space-y-tight">
        {unit.nodes.map((node) => (
          <li key={node.id}>
            <NodeRow node={node} />
          </li>
        ))}
      </ol>
    </section>
  )
}

function NodeRow({ node }: { node: PathNode }) {
  const locked = node.state === 'locked'

  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-9 flex-none items-center justify-center rounded-xl',
          node.state === 'completed'
            ? 'face-chunky [--face:var(--success)]'
            : node.state === 'current'
              ? 'face-chunky [--face:var(--cta)] motion-safe:animate-node-pulse'
              : locked
                ? 'bg-locked-subtle text-locked'
                : 'tile-chunky [--tile-base:var(--primary)]',
        )}
        data-face="soft"
      >
        {node.state === 'completed' ? (
          <Check className="size-4.5 text-white" />
        ) : locked ? (
          <Lock className="size-4" />
        ) : (
          <Emoji name="books" size={18} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-tight">
          <span className="truncate text-sm font-bold text-fg">{node.title}</span>
          {node.state === 'current' && (
            <span className="text-2xs font-bold uppercase tracking-wider text-cta">In progress</span>
          )}
        </span>
        <span className="mt-hair block text-2xs text-fg-tertiary tnum">
          {node.sectionsDone}/{node.sectionsTotal} sections · {node.durationMinutes} min
        </span>
      </span>

      {node.state !== 'completed' && <XPBadge xp={node.xp} size="sm" className="shrink-0" />}
    </>
  )

  if (locked) {
    return (
      <div
        className="flex items-center gap-snug rounded-xl px-tight py-tight"
        aria-disabled
        title="Finish the previous unit first"
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      to={`/learning/materials/${node.slug}`}
      data-emoji-group
      className="flex items-center gap-snug rounded-xl px-tight py-tight transition-colors hover:bg-surface-hover"
    >
      {inner}
    </Link>
  )
}
