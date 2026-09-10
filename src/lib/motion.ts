import type { Transition, Variants } from 'motion/react'

/**
 * Motion system.
 *
 * Every animation in the app pulls its timing from here. One file means the
 * whole product accelerates and settles the same way, which is most of what
 * makes motion feel designed rather than decorated.
 *
 * Rule we hold to: motion must communicate hierarchy, state, feedback, or
 * reward. Anything that only looks nice gets cut.
 */

/* ------------------------------------------------------------------ easing */

/** Fast out, gentle settle. The default for UI that should feel responsive. */
export const easeOut = [0.16, 1, 0.3, 1] as const

/** Slight overshoot for rewards and reveals. Never for routine UI. */
export const easeBack = [0.34, 1.56, 0.64, 1] as const

/* --------------------------------------------------------------- durations */

export const duration = {
  /** Hover, press, colour. Should feel instant. */
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  slow: 0.38,
  /** Reward moments only. */
  reward: 0.56,
} as const

/* ----------------------------------------------------------------- springs */

/** Interface spring: taut, no visible wobble. Panels, popovers, layout. */
export const springUI: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }

/** Press spring: snappier still, for anything under a finger. */
export const springPress: Transition = { type: 'spring', stiffness: 620, damping: 30, mass: 0.5 }

/** Reward spring: one visible bounce, used sparingly. */
export const springReward: Transition = { type: 'spring', stiffness: 380, damping: 16, mass: 0.8 }

/* ---------------------------------------------------------------- variants */

/** Rise and fade. The workhorse entrance. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: easeOut } },
  exit: { opacity: 0, y: -6, transition: { duration: duration.fast, ease: easeOut } },
}

/** Scale in from slightly small. Dialogs, popovers, badges. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: springUI },
  exit: { opacity: 0, scale: 0.97, transition: { duration: duration.fast, ease: easeOut } },
}

/** Reward reveal: overshoots once, then settles. */
export const rewardIn: Variants = {
  hidden: { opacity: 0, scale: 0.6, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: springReward },
  exit: { opacity: 0, scale: 0.9, transition: { duration: duration.fast } },
}

/** Parent for staggered lists. Pair with `staggerItem`. */
export function staggerParent(stagger = 0.045, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  }
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: easeOut } },
}

/* ------------------------------------------------------- interaction props */

/**
 * Standard hover and press for a raised surface. Lifts on hover, sinks on
 * press, so the whole product responds the same way to a pointer.
 */
export const liftInteraction = {
  whileHover: { y: -2, transition: { duration: duration.instant, ease: easeOut } },
  whileTap: { y: 1, scale: 0.995, transition: springPress },
} as const

/** For controls that should not move, only brighten. */
export const tapInteraction = {
  whileTap: { scale: 0.97, transition: springPress },
} as const

/** Icon nudge on hover, used on "continue" affordances. */
export const nudgeRight = {
  rest: { x: 0 },
  hover: { x: 3, transition: { duration: duration.fast, ease: easeOut } },
} as const

/** Viewport config so reveals fire once, slightly before fully in view. */
export const inView = { once: true, amount: 0.25, margin: '0px 0px -40px 0px' } as const
