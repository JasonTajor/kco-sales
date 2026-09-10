import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const fieldBase =
  'w-full rounded-lg border-2 border-line-chunk bg-surface px-snug text-base text-fg ' +
  'placeholder:text-fg-tertiary transition-[border-color,box-shadow] duration-100 ' +
  'hover:border-line-strong focus:border-cta focus:outline-none focus:ring-4 focus:ring-[color-mix(in_oklab,var(--cta)_22%,transparent)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode
  trailing?: ReactNode
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, invalid, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        'h-11',
        leading && 'pl-8',
        trailing && 'pr-8',
        invalid && 'border-danger focus:border-danger focus:ring-[var(--danger-subtle)]',
        className,
      )}
      {...props}
    />
  )

  if (!leading && !trailing) return input

  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-tertiary [&>svg]:size-3.5">
          {leading}
        </span>
      )}
      {input}
      {trailing && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-tertiary [&>svg]:size-3.5">
          {trailing}
        </span>
      )}
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(fieldBase, 'min-h-[88px] resize-y py-snug leading-relaxed', invalid && 'border-danger', className)}
        {...props}
      />
    )
  },
)

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
  htmlFor?: string
}) {
  const generated = useId()
  const id = htmlFor ?? generated
  return (
    <div className={cn('space-y-tight', className)}>
      <label htmlFor={id} className="flex items-center gap-hair text-sm font-bold text-fg">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger-fg">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-tertiary">{hint}</p>
      ) : null}
    </div>
  )
}
