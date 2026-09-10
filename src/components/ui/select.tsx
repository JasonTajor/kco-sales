import type { ReactNode } from 'react'
import * as RSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
  hint?: string
  /** Decoration shown before the label, in the list and on the trigger. */
  icon?: ReactNode
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  className,
  size = 'md',
  ariaLabel,
  disabled,
}: {
  value: string
  onValueChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
  disabled?: boolean
}) {
  return (
    <RSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-between gap-tight rounded-lg border-2 border-line-chunk bg-surface px-snug text-base font-medium text-fg',
          'transition-colors duration-100 hover:bg-surface-hover data-[placeholder]:text-fg-tertiary',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)] disabled:opacity-60',
          size === 'sm' ? 'h-9 text-sm' : 'h-11',
          className,
        )}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown className="size-3.5 text-fg-tertiary" />
        </RSelect.Icon>
      </RSelect.Trigger>

      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border-2 border-line-chunk bg-surface-raised p-tight shadow-lg',
            'animate-pop-in',
          )}
        >
          <RSelect.Viewport className="max-h-72">
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                className={cn(
                  'relative flex cursor-default select-none items-center gap-tight rounded-md py-tight pl-7 pr-tight text-base text-fg outline-none',
                  'data-[highlighted]:bg-surface-hover data-[state=checked]:font-medium',
                )}
              >
                <RSelect.ItemIndicator className="absolute left-2">
                  <Check className="size-3.5 text-primary" />
                </RSelect.ItemIndicator>
                <RSelect.ItemText>
                  {o.icon ? (
                    <span className="inline-flex items-center gap-tight">
                      {o.icon}
                      {o.label}
                    </span>
                  ) : (
                    o.label
                  )}
                </RSelect.ItemText>
                {o.hint && <span className="ml-auto text-xs text-fg-tertiary">{o.hint}</span>}
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  )
}
