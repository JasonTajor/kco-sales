import { forwardRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link, type LinkProps } from 'react-router-dom'
import { springPress } from '@/lib/motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'link'
type Size = 'xs' | 'sm' | 'md' | 'icon' | 'icon-sm'

const base =
  'relative inline-flex select-none items-center justify-center gap-tight whitespace-nowrap rounded-lg font-semibold ' +
  'transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-100 ' +
  'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1'

const variants: Record<Variant, string> = {
  // Chunky CTA. Colour, lip, and press live in `.btn-chunky` (globals.css);
  // the per-size `--lip` and radius below keep the reference proportions.
  primary: 'btn-chunky font-bold',
  secondary:
    'border-2 border-line-chunk border-b-[4px] bg-surface text-fg font-semibold ' +
    'hover:bg-surface-hover hover:border-line-strong active:translate-y-[2px] active:border-b-2',
  ghost: 'border-2 border-transparent font-medium text-fg-secondary hover:bg-surface-hover hover:text-fg active:bg-surface-active',
  subtle: 'border-2 border-transparent bg-neutral-subtle text-fg font-semibold hover:bg-surface-active',
  danger:
    'bg-danger text-white font-bold border-2 border-transparent ' +
    'shadow-[0_4px_0_0_color-mix(in_oklab,var(--danger)_65%,black)] ' +
    'hover:opacity-95 active:translate-y-[4px] active:shadow-none',
  link: 'border border-transparent text-primary underline-offset-4 hover:underline px-0',
}

/**
 * Compact controls keep the desktop console dense, but a 24-28px box is an
 * unusable tap target. `touch-target` paints an invisible 44px hit area around
 * small controls on coarse pointers without changing how they look.
 */
const TOUCH = 'touch-target'

const sizes: Record<Size, string> = {
  xs: `h-7 px-snug text-xs ${TOUCH}`,
  sm: `h-8 px-snug text-sm ${TOUCH}`,
  md: 'h-10 px-card text-base',
  icon: 'h-9 w-9 shrink-0',
  'icon-sm': `h-8 w-8 shrink-0 ${TOUCH}`,
}

/**
 * Reference button measures 79px face, 11px lip, 28px radius.
 * lip = 0.139 x height, radius = 0.354 x height. Applied only to the chunky
 * primary so the other variants keep the console's tighter radii.
 */
const chunkyGeometry: Record<Size, string> = {
  xs: '[--lip:4px] rounded-[10px]',
  sm: '[--lip:4px] rounded-[11px]',
  md: '[--lip:6px] rounded-[14px]',
  icon: '[--lip:5px] rounded-[13px]',
  'icon-sm': '[--lip:4px] rounded-[11px]',
}

/** Taller CTAs keep the ratio: h-10 -> 6px lip / 14px radius, h-11 -> 6 / 16. */
export function chunkyFor(heightPx: number) {
  return {
    '--lip': `${Math.round(heightPx * 0.139)}px`,
    borderRadius: `${Math.round(heightPx * 0.354)}px`,
  } as React.CSSProperties
}

export function buttonStyles(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

/** Drag and animation handlers collide with Motion's own props, so they are
 *  omitted; nothing in this app needs them on a button. */
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop'
  | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onTransitionEnd'
>

export interface ButtonProps extends NativeButtonProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  trailing?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading, icon, trailing, children, disabled, ...props },
  ref,
) {
  const reduce = useReducedMotion()

  return (
    <motion.button
      ref={ref}
      whileHover={reduce || disabled || loading ? undefined : { scale: 1.02 }}
      whileTap={reduce || disabled || loading ? undefined : { scale: 0.98 }}
      transition={springPress}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        variant === 'primary' && chunkyGeometry[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
      {trailing}
    </motion.button>
  )
})

/**
 * A navigation control that looks like a button. Kept distinct from <Button> so
 * that anything which navigates is a real anchor - right-clickable, and
 * announced as a link to screen readers.
 */
export function LinkButton({
  to,
  variant = 'secondary',
  size = 'md',
  icon,
  trailing,
  className,
  children,
  ...props
}: {
  to: string
  variant?: Variant
  size?: Size
  icon?: ReactNode
  trailing?: ReactNode
  className?: string
  children?: ReactNode
} & Omit<LinkProps, 'to' | 'className'>) {
  return (
    <Link
      to={to}
      className={cn(
        buttonStyles(variant, size),
        variant === 'primary' && chunkyGeometry[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {trailing}
    </Link>
  )
}
