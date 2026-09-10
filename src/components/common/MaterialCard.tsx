import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { Material, MaterialProgress } from '@/types'
import { useCategories } from '@/hooks/useCategories'
import { categoryAccent, categoryEmoji } from '@/utils'
import { Emoji } from '@/components/common/Emoji'
import { EmojiTile } from '@/components/common/EmojiTile'
import { cn } from '@/lib/cn'
import { formatDuration, pct } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { ContentStatusBadge, DifficultyBadge } from '@/components/ui/status'
import { ProgressBar } from '@/components/ui/progress'

export function MaterialCard({
  material,
  progress,
  onToggleFavorite,
  showStatus,
}: {
  material: Material
  progress?: MaterialProgress
  onToggleFavorite?: (materialId: string) => void
  /** Admin surfaces care about draft/archived; learners never see them. */
  showStatus?: boolean
}) {
  const { byId } = useCategories()
  const category = byId(material.categoryId)
  const accent = categoryAccent(category?.accent)
  const done = progress?.completedSectionIds.length ?? 0
  const total = material.sections.length
  const favorite = progress?.favorite ?? false

  return (
    <article
      data-emoji-group
      className="chunk chunk-press group relative flex flex-col [--chunk:4px]"
    >
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(material.id)}
          aria-label={favorite ? `Remove ${material.title} from favourites` : `Add ${material.title} to favourites`}
          aria-pressed={favorite}
          className="touch-target absolute right-tight top-tight z-10 rounded-md p-tight text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-warning"
        >
          {favorite ? <Emoji name="xp" size={15} play="once" /> : <Star className="size-3.5" />}
        </button>
      )}

      <Link to={`/learning/materials/${material.slug}`} className="flex flex-1 flex-col p-card focus-visible:outline-none">
        <div className="flex items-center gap-tight">
          {category && (
            <span className={cn('inline-flex items-center gap-hair rounded-full px-tight py-0.5 text-2xs font-medium', accent.chip)}>
              <Emoji name={categoryEmoji(category.icon)} size={13} />
              {category.name}
            </span>
          )}
          <span className="text-2xs text-fg-tertiary">Module {material.moduleNumber}</span>
        </div>

        <h3 className="mt-tight text-md font-semibold tracking-tight text-fg group-hover:text-primary">{material.title}</h3>
        <p className="mt-hair line-clamp-2 flex-1 text-sm leading-[1.5] text-fg-secondary">{material.description}</p>

        <div className="mt-snug flex flex-wrap items-center gap-tight">
          <DifficultyBadge level={material.difficulty} />
          {showStatus && <ContentStatusBadge status={material.status} />}
          <Badge tone="neutral">
            <Emoji name="hourglass" size={13} />
            {formatDuration(material.duration)}
          </Badge>
          <span className="text-2xs text-fg-tertiary">{total} sections</span>
        </div>

        {progress && progress.state !== 'not-started' && (
          <div className="mt-snug flex items-center gap-tight">
            <ProgressBar
              value={pct(done, total)}
              tone={progress.state === 'completed' ? 'success' : 'primary'}
              className="flex-1"
              label={`${material.title} progress`}
            />
            <span className="shrink-0 text-2xs text-fg-tertiary tnum">
              {progress.state === 'completed' ? 'Completed' : `${done}/${total}`}
            </span>
          </div>
        )}
      </Link>
    </article>
  )
}

/** Dense row for the list view of the same collection. */
export function MaterialRow({ material, progress }: { material: Material; progress?: MaterialProgress }) {
  const { byId } = useCategories()
  const category = byId(material.categoryId)
  const accent = categoryAccent(category?.accent)
  const done = progress?.completedSectionIds.length ?? 0
  const total = material.sections.length

  return (
    <Link
      to={`/learning/materials/${material.slug}`}
      data-emoji-group
      className="flex items-center gap-snug border-b border-line px-card py-row-y transition-colors last:border-b-0 hover:bg-surface-hover"
    >
      <EmojiTile
        name={category ? categoryEmoji(category.icon) : 'books'}
        tone={accent.tile}
        className="self-center"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-tight">
          <span className="truncate text-base font-medium text-fg">{material.title}</span>
          <span className="shrink-0 text-2xs text-fg-tertiary">Module {material.moduleNumber}</span>
        </span>
        <span className="mt-hair line-clamp-1 block text-sm text-fg-secondary">{material.description}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-tight sm:flex">
        <DifficultyBadge level={material.difficulty} />
        <span className="w-14 text-right text-2xs text-fg-tertiary tnum">{formatDuration(material.duration)}</span>
        <span className="w-16 text-right text-2xs text-fg-tertiary tnum">
          {progress?.state === 'completed' ? 'Completed' : total ? `${done}/${total}` : ' - '}
        </span>
      </span>
    </Link>
  )
}
