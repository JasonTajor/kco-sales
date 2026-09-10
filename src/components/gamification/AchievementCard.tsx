import type { Achievement } from '@/types'
import type { EmojiName } from '@/data/emoji'
import { cn } from '@/lib/cn'
import { EmojiTile } from '@/components/common/EmojiTile'
import { formatDate } from '@/lib/format'

/**
 * One achievement.
 *
 * Locked achievements show their progress and their hint rather than being
 * hidden or greyed into illegibility - a locked badge you cannot read is just
 * clutter, whereas "3 of 7 days" is a reason to come back.
 */
export function AchievementCard({
  achievement,
  className,
}: {
  achievement: Achievement
  className?: string
}) {
  const unlocked = achievement.percent >= 100

  return (
    <article
      data-emoji-group
      className={cn(
        'chunk flex gap-snug p-card',
        // Locked cards recede, but stay fully readable.
        !unlocked && 'opacity-90',
        className,
      )}
      style={
        unlocked
          ? ({
              '--chunk-face': 'var(--achievement-subtle)',
              '--chunk-edge': 'var(--achievement)',
            } as React.CSSProperties)
          : undefined
      }
    >
      <EmojiTile
        name={achievement.icon as EmojiName}
        tone={unlocked ? 'achievement' : 'locked'}
        size="md"
        play={unlocked ? 'hover' : 'static'}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-tight">
          <h3 className="truncate text-base font-bold text-fg">{achievement.title}</h3>
          {unlocked ? (
            <span className="shrink-0 text-2xs font-bold uppercase tracking-wider text-achievement">
              Unlocked
            </span>
          ) : (
            <span className="shrink-0 text-2xs font-bold text-fg-tertiary tnum">
              {achievement.percent}%
            </span>
          )}
        </div>

        <p className="mt-hair text-sm text-fg-secondary">{achievement.description}</p>

        {unlocked ? (
          achievement.unlockedAt && (
            <p className="mt-tight text-2xs text-fg-tertiary">
              Earned {formatDate(achievement.unlockedAt)}
            </p>
          )
        ) : (
          <>
            <div className="meter mt-tight">
              <div
                className="meter-fill bg-achievement"
                style={{ width: `${achievement.percent}%` }}
              />
            </div>
            <p className="mt-hair text-2xs text-fg-tertiary">{achievement.hint}</p>
          </>
        )}
      </div>
    </article>
  )
}
