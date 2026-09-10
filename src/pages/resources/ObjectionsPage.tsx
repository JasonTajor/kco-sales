import { useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import type { Objection } from '@/types'
import { objectionCategoryLabels } from '@/data/objections'
import { resourceService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { ErrorState } from '@/components/ui/states'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/cn'
import { plural } from '@/lib/format'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/states'
import { Emoji, EmojiText } from '@/components/common/Emoji'
import { IconTile } from '@/components/common/EmojiTile'

const frequencyTone: Record<Objection['frequency'], BadgeTone> = {
  'very-high': 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
}

const frequencyLabel: Record<Objection['frequency'], string> = {
  'very-high': 'Heard constantly',
  high: 'Heard often',
  medium: 'Occasional',
  low: 'Rare',
}

/** The four A.C.A.C. moves, in the order they are spoken. */
const steps = [
  { key: 'acknowledge', letter: 'A', label: 'Acknowledge' },
  { key: 'clarify', letter: 'C', label: 'Clarify' },
  { key: 'address', letter: 'A', label: 'Address' },
  { key: 'close', letter: 'C', label: 'Close' },
] as const

export function ObjectionsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Objection['category'] | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const debounced = useDebounce(search, 150)

  /**
   * Fetched, not imported.
   *
   * Filtering happens server-side so a large library does not have to be
   * downloaded to search it, and - more importantly - so this page shows what
   * an admin actually published rather than the seed file it started from.
   */
  const { data, loading, error, reload } = useAsync(
    () => resourceService.objections({ category, search: debounced }),
    [category, debounced],
  )

  const results = data ?? []

  // Open the first result once, rather than fighting the user's choice on
  // every keystroke.
  const firstId = results[0]?.id ?? null
  const activeId = open && results.some((o) => o.id === open) ? open : firstId

  const active = search !== '' || category !== 'all'

  return (
    <Page>
      <PageHeader
        title="Objection Handling"
        description="Every objection KCO agents hear, answered with A.C.A.C. - acknowledge, clarify, address, close."
        crumbs={[{ label: 'Sales Resources' }, { label: 'Objection Handling' }]}
        actions={
          <LinkButton to="/learning/materials/objection-handling" variant="secondary" size="sm">
            Read the module
          </LinkButton>
        }
      />

      <Toolbar>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search objections…"
          aria-label="Search objections"
          leading={<Search className="size-3.5" />}
          className="w-[260px] max-w-full"
        />
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as Objection['category'] | 'all')}
          ariaLabel="Filter by objection type"
          size="sm"
          options={[
            { value: 'all', label: 'All types' },
            ...Object.entries(objectionCategoryLabels).map(([value, label]) => ({ value, label })),
          ]}
        />
        {active && (
          <Button
            variant="ghost"
            size="sm"
            icon={<X className="size-3.5" />}
            onClick={() => {
              setSearch('')
              setCategory('all')
            }}
          >
            Clear
          </Button>
        )}
        <span className="text-sm text-fg-tertiary" aria-live="polite">
          {plural(results.length, 'objection')}
        </span>
      </Toolbar>

      {error ? (
        <ErrorState description={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <CardGridSkeleton count={4} />
      ) : results.length === 0 ? (
        <EmptyState title="No objections match" description="Try a different phrase or clear the filter." />
      ) : (
        <ul className="space-y-group">
          {results.map((o) => {
            const expanded = activeId === o.id
            // Side by side the badges starve the objection down to a sliver on a
            // phone, so below `sm` they drop under the text instead.
            const badges = (
              <>
                <Badge tone="neutral">{objectionCategoryLabels[o.category]}</Badge>
                <Badge tone={frequencyTone[o.frequency]} dot>
                  {frequencyLabel[o.frequency]}
                </Badge>
              </>
            )
            return (
              <li key={o.id} className="overflow-hidden chunk">
                <h2>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : o.id)}
                    aria-expanded={expanded}
                    className="relative flex w-full items-start gap-snug py-card pl-card pr-11 text-left chunk-press hover:bg-surface-hover"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-md font-semibold tracking-tight text-fg">“{o.objection}”</span>
                      <span className="mt-hair block text-sm text-fg-secondary">{o.translation}</span>
                      <span className="mt-tight flex flex-wrap items-center gap-tight sm:hidden">{badges}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-tight sm:flex">{badges}</span>
                    <ChevronDown
                      className={cn(
                        'absolute right-4 top-4 size-4 text-fg-tertiary transition-transform',
                        expanded && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </button>
                </h2>

                {expanded && (
                  <div className="space-y-group border-t border-line p-card">
                    {o.claimSensitive && (
                      <Callout variant="warning" title="Illustrative only">
                        This answer touches earnings. Present any figure as an example, never as a guaranteed return.
                      </Callout>
                    )}

                    <ol className="space-y-tight">
                      {steps.map((step, i) => (
                        <li key={i} className="flex gap-tight">
                          <IconTile tone="primary" size="xs" className="text-sm font-bold">
                            {step.letter}
                          </IconTile>
                          <span className="min-w-0 pt-px">
                            <span className="block text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">
                              {step.label}
                            </span>
                            <span className="mt-hair block text-md leading-[1.6] text-fg">{o[step.key]}</span>
                          </span>
                        </li>
                      ))}
                    </ol>

                    {o.pitfalls.length > 0 && (
                      <div className="rounded-md bg-bg-inset p-card">
                        <p className="mb-tight flex items-center gap-tight text-2xs font-semibold uppercase tracking-wider text-danger-fg">
                          <Emoji name="warning" size={13} />
                          Do not
                        </p>
                        <ul className="space-y-hair">
                          {o.pitfalls.map((p, i) => (
                            <li key={i} className="text-base leading-[1.55] text-fg-secondary">
                              <EmojiText>{p}</EmojiText>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
