import * as RDropdown from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const DropdownMenu = RDropdown.Root
export const DropdownTrigger = RDropdown.Trigger

export function DropdownContent({
  children,
  align = 'end',
  className,
  sideOffset = 6,
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
  sideOffset?: number
}) {
  return (
    <RDropdown.Portal>
      <RDropdown.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[190px] animate-pop-in overflow-hidden rounded-xl border-2 border-line-chunk bg-surface-raised p-tight shadow-lg',
          className,
        )}
      >
        {children}
      </RDropdown.Content>
    </RDropdown.Portal>
  )
}

export function DropdownItem({
  children,
  onSelect,
  icon,
  shortcut,
  destructive,
  disabled,
}: {
  children: ReactNode
  onSelect?: () => void
  icon?: ReactNode
  shortcut?: string
  destructive?: boolean
  disabled?: boolean
}) {
  return (
    <RDropdown.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-default select-none items-center gap-tight rounded-md px-snug py-tight text-base font-medium outline-none',
        'data-[highlighted]:bg-surface-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive ? 'text-danger-fg data-[highlighted]:bg-danger-subtle' : 'text-fg',
        '[&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-fg-tertiary',
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-xs text-fg-tertiary">{shortcut}</span>}
    </RDropdown.Item>
  )
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <div className="px-snug py-tight text-xs font-bold uppercase tracking-wide text-fg-tertiary">{children}</div>
}

export function DropdownSeparator() {
  return <RDropdown.Separator className="my-hair h-px bg-line" />
}

export function DropdownCheckboxItem({
  children,
  checked,
  onCheckedChange,
}: {
  children: ReactNode
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <RDropdown.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={(e) => e.preventDefault()}
      className={cn(
        'flex cursor-default select-none items-center gap-tight rounded-sm py-tight pl-7 pr-tight text-base text-fg outline-none',
        'relative data-[highlighted]:bg-surface-hover',
      )}
    >
      <RDropdown.ItemIndicator className="absolute left-2 text-primary">✓</RDropdown.ItemIndicator>
      {children}
    </RDropdown.CheckboxItem>
  )
}
