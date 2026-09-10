import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Bookmark, ListChecks, MessageSquareQuote, Search, Sigma } from 'lucide-react'
import type { QuickReferenceCard } from '@/types'
import { resourceService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { ErrorState } from '@/components/ui/states'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { Blocks } from '@/components/content/BlockRenderer'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { Emoji } from '@/components/common/Emoji'

type Channel = 'all' | 'phone' | 'chat'

const kindIcon: Record<QuickReferenceCard['kind'], typeof Bookmark> = {
  script: MessageSquareQuote,
  formula: Sigma,
  checklist: ListChecks,
  rule: Bookmark,
}

const kindLabel: Record<QuickReferenceCard['kind'], string> = {
  script: 'Script',
  formula: 'Formula',
  checklist: 'Checklist',
  rule: 'Rule',
}

/**
 * §26 - built for speed. An agent mid-call should reach the exact line in
 * seconds, so search covers card content and the wording library at once.
 */
export function QuickReferencePage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState<Channel>('all')

  const q = query.trim().toLowerCase()

  /**
   * Both libraries come from the service so this page reflects what an admin
   * published, not the seed file it started from.
   *
   * Fetched whole rather than filtered server-side: there are a couple of
   * dozen cards, they are searched on every keystroke, and matching inside a
   * card's blocks is a client-side concern anyway.
   */
  const reference = useAsync(() => resourceService.quickReference(), [])
  const wording = useAsync(() => resourceService.wording(), [])

  const allCards = reference.data ?? []
  const allWording = wording.data ?? []

  const activeSlug = params.get('card') ?? allCards[0]?.slug ?? ''

  const cards = useMemo(
    () =>
      allCards.filter((c) => {
        if (channel !== 'all' && c.channel !== channel && c.channel !== 'both') return false
        if (!q) return true
        return (
          c.title.toLowerCase().includes(q) ||
          c.kicker.toLowerCase().includes(q) ||
          JSON.stringify(c.blocks).toLowerCase().includes(q)
        )
      }),
    [allCards, channel, q],
  )

  const wordingMatches = useMemo(() => {
    if (q.length < 2) return []
    return allWording.filter(
      (p) => p.avoid.toLowerCase().includes(q) || p.use.toLowerCase().includes(q),
    )
  }, [allWording, q])

  const active = allCards.find((c) => c.slug === activeSlug) ?? cards[0]

  const loading = reference.loading && !reference.data
  const error = reference.error ?? wording.error

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Learning' }, { label: 'Quick Reference' }]}
        title="Quick Reference"
        description="Openings, formulas, checklists, and wording - the things you need while the customer is still on the line."
        actions={
          <SegmentedControl
            ariaLabel="Filter by channel"
            value={channel}
            onChange={setChannel}
            options={[
              { value: 'all', label: 'All' },
              { value: 'phone', label: 'Phone' },
              { value: 'chat', label: 'Chat' },
            ]}
          />
        }
      />

      <Toolbar>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search scripts, formulas, and wording…"
          aria-label="Search quick reference"
          leading={<Search />}
          className="w-full sm:w-96"
        />
        {q && (
          <span className="text-sm text-fg-tertiary tnum">
            {cards.length} cards · {wordingMatches.length} wording swaps
          </span>
        )}
      </Toolbar>

      {/* A direct wording hit is usually what the agent wanted - show it first. */}
      {wordingMatches.length > 0 && (
        <section className="rounded-lg border border-primary/25 bg-primary-subtle">
          <div className="flex items-center gap-tight border-b border-line px-card py-tight">
            <Emoji name="bolt" size={15} />
            <h2 className="text-base font-semibold text-fg">Wording matches</h2>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {wordingMatches.slice(0, 6).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-tight px-card py-row-y">
                <span className="text-base text-fg-tertiary line-through">{p.avoid}</span>
                <ArrowRight className="size-3.5 shrink-0 text-fg-tertiary" aria-hidden />
                <span className="text-base font-medium text-fg">{p.use}</span>
                <Badge tone="neutral" className="ml-auto">
                  {p.context === 'both' ? 'Phone & chat' : p.context}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error ? (
        <ErrorState description={error.message} onRetry={reference.reload} />
      ) : loading ? (
        <CardGridSkeleton count={6} />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No reference cards match"
          description="Try a different word, or clear the channel filter."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery('')
                setChannel('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-rhythm lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Reference cards" className="lg:sticky lg:top-4 lg:self-start">
            <ul className="space-y-tight">
              {cards.map((c) => {
                const isActive = active?.slug === c.slug
                const Icon = kindIcon[c.kind]
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setParams({ card: c.slug }, { replace: true })}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center gap-snug rounded-xl px-snug py-snug text-left',
                        'transition-[background-color,transform,box-shadow] duration-100',
                        isActive
                          // Reuses the CTA treatment, so "active" looks the same
                          // here as it does in the sidebar and on buttons.
                          ? 'btn-chunky [--lip:4px]'
                          : 'text-fg-secondary hover:bg-surface-hover',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg',
                          isActive ? 'bg-white/20 text-cta-fg' : 'bg-neutral-subtle text-fg-tertiary',
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-base', isActive ? 'font-bold text-cta-fg' : 'font-semibold text-fg')}>
                        {c.title}
                      </span>
                      <span
                        className={cn(
                          'block truncate text-xs',
                          isActive ? 'text-cta-fg/80' : 'text-fg-tertiary',
                        )}
                      >
                        {c.kicker}
                      </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {active && (
            <article className="min-w-0">
              <header className="mb-group border-b border-line pb-snug">
                <div className="flex flex-wrap items-center gap-tight">
                  <Badge tone="primary">{kindLabel[active.kind]}</Badge>
                  <Badge tone="neutral">
                    {active.channel === 'both' ? 'Phone & chat' : active.channel === 'phone' ? 'Phone' : 'Chat'}
                  </Badge>
                </div>
                <h2 className="mt-tight text-2xl font-semibold tracking-[-0.02em] text-fg">{active.title}</h2>
                <p className="mt-hair text-md text-fg-secondary">{active.kicker}</p>
              </header>
              <Blocks blocks={active.blocks} />
            </article>
          )}
        </div>
      )}
    </Page>
  )
}
