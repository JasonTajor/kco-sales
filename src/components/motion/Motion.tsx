import { forwardRef, useEffect, useState, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { animate, motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/cn'
import {
  duration,
  easeOut,
  inView,
  liftInteraction,
  riseIn,
  springPress,
  staggerItem,
  staggerParent,
} from '@/lib/motion'

/**
 * Shared motion primitives.
 *
 * Components import these rather than reaching for `motion.div` directly, so
 * timing stays consistent and `prefers-reduced-motion` is handled once instead
 * of being forgotten in a corner.
 */

/* --------------------------------------------------------------- reveals */

/** Fades and rises its children as they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const reduce = useReducedMotion()
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={inView}
      variants={riseIn}
      transition={{ delay }}
    >
      {children}
    </Comp>
  )
}

/** Wraps a list so its children arrive in sequence. Pair with `StaggerItem`. */
export function Stagger({
  children,
  className,
  stagger = 0.045,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  stagger?: number
  delay?: number
  as?: 'div' | 'ul' | 'ol' | 'section'
}) {
  const reduce = useReducedMotion()
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={inView}
      variants={staggerParent(stagger, delay)}
    >
      {children}
    </Comp>
  )
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'li' | 'article'
}) {
  const Comp = motion[as]
  return (
    <Comp className={className} variants={staggerItem}>
      {children}
    </Comp>
  )
}

/* ---------------------------------------------------------- interactions */

type PressableProps = HTMLMotionProps<'div'> & {
  children: ReactNode
  className?: string
  /** Off for surfaces that should brighten but not move. */
  lift?: boolean
}

/** A surface that lifts on hover and sinks on press. */
export const Pressable = forwardRef<HTMLDivElement, PressableProps>(function Pressable(
  { children, className, lift = true, ...props },
  ref,
) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      ref={ref}
      className={className}
      {...(reduce || !lift ? {} : liftInteraction)}
      {...props}
    >
      {children}
    </motion.div>
  )
})

/** Router link that lifts on hover. The default for card-shaped links. */
export function MotionLink({
  to,
  children,
  className,
  lift = true,
  ...props
}: LinkProps & { lift?: boolean }) {
  const reduce = useReducedMotion()
  const MLink = motion.create(Link)
  return (
    <MLink
      to={to}
      className={className}
      {...(reduce || !lift ? {} : liftInteraction)}
      {...(props as object)}
    >
      {children}
    </MLink>
  )
}

/* ------------------------------------------------------------- numerals */

/**
 * Counts up to `value`. Used for XP, scores, and streaks, where watching the
 * number climb is part of the reward.
 *
 * The tween runs on a motion value outside React's render cycle; only the
 * rounded output is committed to state, so a 900ms count costs ~30 renders
 * rather than one per frame.
 */
export function CountUp({
  value,
  className,
  duration: dur = 0.9,
}: {
  value: number
  className?: string
  duration?: number
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: dur,
      ease: easeOut,
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value, dur, reduce])

  return <span className={cn('tnum', className)}>{display.toLocaleString()}</span>
}

/* ---------------------------------------------------------------- shine */

/** A one-pass sheen across a surface. Reward moments only. */
export function Shine({ trigger }: { trigger: number }) {
  const reduce = useReducedMotion()
  if (reduce || trigger === 0) return null
  return (
    <motion.span
      key={trigger}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
    >
      <motion.span
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        initial={{ x: '-140%' }}
        animate={{ x: '340%' }}
        transition={{ duration: 0.75, ease: easeOut }}
      />
    </motion.span>
  )
}

/* -------------------------------------------------------------- page bit */

/** Route-level entrance. Subtle by design: it should not delay reading. */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: easeOut }}
    >
      {children}
    </motion.div>
  )
}

export { springPress }
