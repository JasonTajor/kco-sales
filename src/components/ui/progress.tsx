import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { easeOut } from '@/lib/motion'

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = 'primary',
  label,
}: {
  value: number
  max?: number
  className?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  label?: string
}) {
  const reduce = useReducedMotion()
  const p = Math.max(0, Math.min(100, (value / max) * 100))
  const tones = {
    primary: 'bg-cta',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('meter w-full', className)}
    >
      <motion.div
        className={cn('meter-fill', tones[tone])}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${p}%` }}
        transition={{ duration: 0.7, ease: easeOut }}
      />
    </div>
  )
}

export function ProgressRing({
  value,
  size = 40,
  stroke = 4,
  label,
  tone = 'var(--cta)',
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  tone?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-inset)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.25,1,0.5,1)' }}
        />
      </svg>
      <span className="absolute text-2xs font-semibold text-fg tnum" aria-label={label}>
        {Math.round(value)}%
      </span>
    </div>
  )
}
