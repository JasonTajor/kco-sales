import type { LevelInfo, StreakInfo } from '@/types'
import { cn } from '@/lib/cn'
import { Emoji } from '@/components/common/Emoji'

/**
 * The reward readouts.
 *
 * Each badge carries exactly one colour with one job - XP is amber, streaks
 * are orange, achievements violet - so colour is information rather than
 * decoration. The tokens live in globals.css so the three can never drift.
 */

export function XPBadge({
  xp,
  size = 'md',
  className,
}: {
  xp: number
  size?: 'sm' | 'md'
  className?: string
}) {
  if (xp <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-hair rounded-full bg-xp-subtle font-bold text-xp',
        size === 'sm' ? 'px-tight py-0.5 text-2xs' : 'px-snug py-hair text-xs',
        className,
      )}
    >
      <Emoji name="xp" size={size === 'sm' ? 12 : 14} />
      <span className="tnum">+{xp}</span>
    </span>
  )
}

export function StreakBadge({
  streak,
  className,
}: {
  streak: StreakInfo
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-hair rounded-full bg-streak-subtle px-snug py-hair text-xs font-bold text-streak',
        className,
      )}
    >
      <Emoji name="streak" size={14} play={streak.activeToday ? 'loop' : 'static'} />
      <span className="tnum">{streak.current}</span>
      <span className="font-medium">day{streak.current === 1 ? '' : 's'}</span>
    </span>
  )
}

/** The last seven days as dots, oldest first. */
export function StreakWeek({ streak, className }: { streak: StreakInfo; className?: string }) {
  return (
    <ul className={cn('flex items-center gap-hair', className)} aria-label="This week">
      {streak.week.map((d, i) => (
        <li key={i} className="flex flex-col items-center gap-0.5">
          <span
            aria-hidden
            className={cn(
              'size-5 rounded-full border-2',
              d.active ? 'border-streak bg-streak' : 'border-line-chunk bg-bg-inset',
            )}
          />
          <span className="text-[10px] font-medium text-fg-tertiary">{d.day}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The level readout: a ring showing progress through the current level, with
 * the title beside it. The number inside the ring is the level, not the
 * percentage - the percentage is the ring itself.
 */
export function LevelMeter({
  level,
  className,
  compact,
}: {
  level: LevelInfo
  className?: string
  compact?: boolean
}) {
  const size = compact ? 40 : 56
  const stroke = compact ? 4 : 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (level.percent / 100) * circumference

  return (
    <div className={cn('flex items-center gap-snug', className)}>
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-inset)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--xp)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-extrabold text-fg tnum',
            compact ? 'text-sm' : 'text-lg',
          )}
        >
          {level.level}
        </span>
      </div>

      <div className="min-w-0">
        <p className={cn('font-bold text-fg', compact ? 'text-sm' : 'text-base')}>{level.title}</p>
        <p className="text-xs text-fg-secondary tnum">
          {level.percent >= 100
            ? `${level.totalXp} XP`
            : `${level.xpIntoLevel} / ${level.xpForNextLevel} XP`}
        </p>
      </div>
    </div>
  )
}
