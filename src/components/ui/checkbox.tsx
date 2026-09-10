import * as RCheckbox from '@radix-ui/react-checkbox'
import * as RRadio from '@radix-ui/react-radio-group'
import * as RSwitch from '@radix-ui/react-switch'
import { Check, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  className,
  ariaLabel,
}: {
  checked: boolean | 'indeterminate'
  onCheckedChange: (v: boolean) => void
  label?: ReactNode
  description?: string
  className?: string
  ariaLabel?: string
}) {
  const box = (
    <RCheckbox.Root
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      aria-label={ariaLabel}
      className={cn(
        'touch-target relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-line-strong bg-surface shadow-xs transition-colors',
        'hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-1',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
      )}
    >
      <RCheckbox.Indicator className="text-primary-fg">
        {checked === 'indeterminate' ? <Minus className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  )

  if (!label) return <span className={className}>{box}</span>

  return (
    <label className={cn('flex cursor-pointer items-start gap-tight', className)}>
      <span className="mt-hair">{box}</span>
      <span className="space-y-hair">
        <span className="block text-base text-fg">{label}</span>
        {description && <span className="block text-sm text-fg-tertiary">{description}</span>}
      </span>
    </label>
  )
}

export function RadioGroup({
  value,
  onValueChange,
  options,
  className,
  ariaLabel,
}: {
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: ReactNode; description?: string }[]
  className?: string
  ariaLabel?: string
}) {
  return (
    <RRadio.Root value={value} onValueChange={onValueChange} aria-label={ariaLabel} className={cn('space-y-tight', className)}>
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-start gap-tight">
          <RRadio.Item
            value={o.value}
            className={cn(
              'touch-target relative mt-hair flex size-4 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface shadow-xs transition-colors',
              'hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-1',
              'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
            )}
          >
            <RRadio.Indicator className="size-1.5 rounded-full bg-primary-fg" />
          </RRadio.Item>
          <span className="space-y-hair">
            <span className="block text-base text-fg">{o.label}</span>
            {o.description && <span className="block text-sm text-fg-tertiary">{o.description}</span>}
          </span>
        </label>
      ))}
    </RRadio.Root>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  ariaLabel,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
  description?: string
  ariaLabel?: string
}) {
  const control = (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel ?? label}
      className={cn(
        'touch-target relative h-[18px] w-8 shrink-0 rounded-full border border-transparent bg-line-strong transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 data-[state=checked]:bg-primary',
      )}
    >
      <RSwitch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[15px]" />
    </RSwitch.Root>
  )

  if (!label) return control

  return (
    <div className="flex items-start justify-between gap-rhythm">
      <div className="space-y-hair">
        <p className="text-base font-medium text-fg">{label}</p>
        {description && <p className="text-sm text-fg-secondary">{description}</p>}
      </div>
      {control}
    </div>
  )
}
