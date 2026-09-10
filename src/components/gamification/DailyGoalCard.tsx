import type { DailyGoal, StreakInfo } from '@/types'
import { cn } from '@/lib/cn'
import { Emoji } from '@/components/common/Emoji'
import { StreakWeek } from './Stats'

/**
 * Today's goal, and the week behind it.
 *
 * The goal is minutes of study rather than sections or XP, because minutes are
 * the thing a learner can actually plan around between chats.
 */
export function DailyGoalCard({
  goal,
  streak,
  className,
}: {
  goal: DailyGoal
  streak: StreakInfo
  className?: string
}) {
  return (
    <section data-tour="goal" className={cn('chunk p-card', className)} data-emoji-group>
      <div className="flex items-start justify-between gap-group">
        <div className="min-w-0">
          <div className="flex items-center gap-tight">
            <Emoji name={goal.met ? 'success' : 'goal'} size={18} play={goal.met ? 'loop' : 'hover'} />
            <h2 className="text-base font-bold text-fg">Today's goal</h2>
          </div>
          <p className="mt-hair text-sm text-fg-secondary tnum">
            {goal.met
              ? `Done - ${goal.earnedMinutes} minutes today.`
              : `${goal.earnedMinutes} of ${goal.targetMinutes} minutes.`}
          </p>
        </div>

        <StreakWeek streak={streak} className="shrink-0" />
      </div>

      <div className="meter mt-group">
        <div
          className={cn('meter-fill', goal.met ? 'bg-success' : 'bg-streak')}
          style={{ width: `${goal.percent}%` }}
        />
      </div>
    </section>
  )
}
