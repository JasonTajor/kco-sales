import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { Select } from './select'

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
  onPageSizeChange?: (s: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="flex flex-wrap items-center justify-between gap-snug px-hair py-tight">
      <p className="text-sm text-fg-secondary tnum">
        {from} - {to} of {total}
      </p>

      <div className="flex items-center gap-snug">
        {onPageSizeChange && (
          <div className="hidden items-center gap-tight sm:flex">
            <span className="text-sm text-fg-tertiary">Rows</span>
            <Select
              size="sm"
              ariaLabel="Rows per page"
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
              options={[10, 25, 50].map((n) => ({ value: String(n), label: String(n) }))}
              className="w-[68px]"
            />
          </div>
        )}

        <div className="flex items-center gap-hair">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-tight text-sm text-fg-secondary tnum">
            {page} / {pages}
          </span>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
