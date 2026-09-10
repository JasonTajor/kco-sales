import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * The KCO mascot.
 *
 * One artwork (`public/mascot-kco.png`) presented at a few sizes and poses.
 * There is only one drawing, so a "pose" is a slight rotation and offset
 * rather than different art - enough to make a greeting feel different from a
 * think, without pretending to a sprite sheet that does not exist.
 */
export type MascotPose = 'wave' | 'think' | 'cheer' | 'point'
export type MascotSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<MascotSize, string> = {
  sm: 'size-12',
  md: 'size-20',
  lg: 'size-28',
  xl: 'size-40',
}

/** Small transforms, so the same drawing reads as a different attitude. */
const POSES: Record<MascotPose, string> = {
  wave: 'rotate-[-4deg]',
  think: 'rotate-[3deg]',
  cheer: 'rotate-[-7deg] scale-[1.03]',
  point: 'rotate-[6deg]',
}

export function Mascot({
  pose = 'wave',
  size = 'md',
  float = false,
  bloom = false,
  className,
}: {
  pose?: MascotPose
  size?: MascotSize
  /** Gentle idle motion. Suppressed under prefers-reduced-motion. */
  float?: boolean
  /** Soft radial glow behind the figure, for use on a coloured wash. */
  bloom?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {bloom && (
        <span aria-hidden className="kco-bloom absolute inset-[-30%] rounded-full" />
      )}
      {/*
        The float lives on a wrapper, not the image. Both the pose and the
        animation write `transform`, so on one element the keyframe would
        overwrite the rotation and the pose would vanish mid-cycle.
      */}
      <span
        className={cn(
          'relative inline-flex',
          float && 'motion-safe:animate-[float_4s_ease-in-out_infinite]',
        )}
      >
        <img
          src="/mascot-kco.png"
          alt=""
          aria-hidden
          draggable={false}
          className={cn('select-none object-contain', SIZES[size], POSES[pose])}
        />
      </span>
    </div>
  )
}

/**
 * An empty state with the mascot instead of an icon.
 *
 * Used on learner-facing screens where an empty library or a filtered-out list
 * is a normal, unalarming situation - the mascot keeps it from reading as an
 * error. The admin console uses the plain `EmptyState` instead.
 */
export function MascotEmptyState({
  pose = 'think',
  title,
  description,
  action,
  className,
}: {
  pose?: MascotPose
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-chunk bg-surface px-8 py-14 text-center',
        className,
      )}
    >
      <Mascot pose={pose} size="lg" />
      <p className="mt-group text-lg font-bold text-fg">{title}</p>
      {description && <p className="mt-hair max-w-sm text-sm text-fg-secondary">{description}</p>}
      {action && <div className="mt-group">{action}</div>}
    </div>
  )
}
