import { useMemo, useState } from 'react'
import { ArrowRight, Search, X } from 'lucide-react'
import type { Material, WordingPair } from '@/types'
import { materialService, resourceService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { ErrorState } from '@/components/ui/states'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { plural } from '@/lib/format'
import { Blocks } from '@/components/content/BlockRenderer'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { Toolbar } from '@/components/layout/PageHeader'

/**
 * Phone Etiquette and Chat Etiquette are the same page pointed at a different
 * channel - one component keeps the two in step as content grows.
 */
export function ScriptLibrary({
  channel,
  materialSlugs,
}: {
  channel: 'phone' | 'chat'
  /** Modules that back this channel, shown as further reading. */
  materialSlugs: string[]
}) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  /**
   * §24: scripts live in the database, never inside a React component, so an
   * admin can fix a wording without a deploy. Three libraries feed this page -
   * the extracted script rows, the quick-reference cards, and the avoid/use
   * wording pairs - and all three arrive from the service layer.
   */
  const scriptsAsync = useAsync(() => resourceService.scripts({ kind: channel }), [channel])
  const referenceAsync = useAsync(() => resourceService.quickReference(), [])
  const wordingAsync = useAsync(() => resourceService.wording(), [])
  const materialsAsync = useAsync(() => materialService.list({ status: 'published' }), [])

  const scripts = scriptsAsync.data ?? []

  const cards = useMemo(
    () =>
      (referenceAsync.data ?? []).filter((c) => c.channel === channel || c.channel === 'both'),
    [referenceAsync.data, channel],
  )

  const pairs = useMemo<WordingPair[]>(
    () =>
      (wordingAsync.data ?? []).filter((p) => p.context === channel || p.context === 'both'),
    [wordingAsync.data, channel],
  )

  const visibleScripts = useMemo(
    () =>
      q
        ? scripts.filter((sc) =>
            `${sc.title} ${sc.situation} ${sc.lines.join(' ')}`.toLowerCase().includes(q),
          )
        : scripts,
    [scripts, q],
  )

  const loading =
    (scriptsAsync.loading && !scriptsAsync.data) || (referenceAsync.loading && !referenceAsync.data)
  const error = scriptsAsync.error ?? referenceAsync.error ?? wordingAsync.error

  const visibleCards = useMemo(
    () => (q ? cards.filter((c) => `${c.title} ${c.kicker}`.toLowerCase().includes(q)) : cards),
    [cards, q],
  )

  const visiblePairs = useMemo(
    () =>
      q
        ? pairs.filter((p) => `${p.avoid} ${p.use} ${p.note ?? ''} ${p.tags.join(' ')}`.toLowerCase().includes(q))
        : pairs,
    [pairs, q],
  )

  const linked = materialSlugs
    .map((slug) => (materialsAsync.data ?? []).find((m) => m.slug === slug))
    .filter((m): m is Material => Boolean(m))

  const nothing =
    visibleCards.length === 0 && visiblePairs.length === 0 && visibleScripts.length === 0

  return (
    <>
      <Toolbar>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scripts and wording…"
          aria-label="Search scripts and wording"
          leading={<Search className="size-3.5" />}
          className="w-[300px] max-w-full"
        />
        {q && (
          <Button variant="ghost" size="sm" icon={<X className="size-3.5" />} onClick={() => setSearch('')}>
            Clear
          </Button>
        )}
        <span className="text-sm text-fg-tertiary" aria-live="polite">
          {plural(visibleScripts.length, 'script')} · {plural(visibleCards.length, 'card')} ·{' '}
          {plural(visiblePairs.length, 'wording swap')}
        </span>
      </Toolbar>

      {error && <ErrorState description={error.message} onRetry={scriptsAsync.reload} />}
      {loading && !error && <CardGridSkeleton count={4} />}

      {!loading && !error && nothing && (
        <EmptyState
          title="Nothing matches that"
          description="Try a shorter phrase, or clear the search to see the whole library."
        />
      )}

      {/*
        The extracted scripts, straight from the library table. These are the
        exact lines transcribed from the training documents; a rep copies one
        mid-conversation, so the copy button matters more than the styling.
      */}
      {visibleScripts.length > 0 && (
        <section className="space-y-group">
          <h2 className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
            Scripts
          </h2>
          <div className="grid grid-cols-1 items-start gap-group lg:grid-cols-2">
            {visibleScripts.map((sc) => (
              <Card key={sc.id} className="p-0">
                <CardHeader
                  title={sc.title}
                  description={sc.situation}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(sc.lines.join('\n'))
                      }}
                    >
                      Copy
                    </Button>
                  }
                />
                <div className="space-y-hair px-card pb-card">
                  {sc.lines.map((line, i) => (
                    <p key={i} className="text-base leading-relaxed text-fg">
                      {line}
                    </p>
                  ))}
                  {sc.notes && (
                    <p className="pt-tight text-2xs italic text-fg-tertiary">{sc.notes}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {visibleCards.length > 0 && (
        <section className="grid grid-cols-1 items-start gap-group lg:grid-cols-2">
          {visibleCards.map((card) => (
            <Card key={card.id} className="p-0">
              <CardHeader
                title={card.title}
                description={card.kicker}
                action={<Badge tone="neutral">{card.kind}</Badge>}
              />
              <div className="p-card">
                <Blocks blocks={card.blocks} />
              </div>
            </Card>
          ))}
        </section>
      )}

      {visiblePairs.length > 0 && (
        <section>
          <Card className="p-0">
            <CardHeader
              title="Say this, not that"
              description={`Wording swaps that apply to ${channel === 'phone' ? 'calls' : 'chat'}.`}
              action={
                <LinkButton to="/learning/quick-reference" variant="ghost" size="sm">
                  All wording
                </LinkButton>
              }
            />
            <ul className="divide-y divide-[var(--border)]">
              {visiblePairs.map((p) => (
                <li key={p.id} className="grid grid-cols-1 gap-tight px-card py-row-y sm:grid-cols-[1fr_auto_1fr] sm:items-baseline sm:gap-snug">
                  <span className="text-base text-fg-secondary line-through decoration-danger/40">{p.avoid}</span>
                  <ArrowRight className="hidden size-3.5 shrink-0 self-center text-fg-tertiary sm:block" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-base text-fg">{p.use}</span>
                    {p.note && <span className="mt-hair block text-xs text-fg-tertiary">{p.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {linked.length > 0 && !q && (
        <section>
          <Card className="p-0">
            <CardHeader title="Read the full module" description="The reasoning behind these lines." />
            <ul className="divide-y divide-[var(--border)]">
              {linked.map((m) => (
                <li key={m.id}>
                  <LinkButton
                    to={`/learning/materials/${m.slug}`}
                    variant="ghost"
                    className="h-auto w-full justify-start px-card py-snug text-left"
                    trailing={<ArrowRight className="ml-auto size-3.5 shrink-0" />}
                  >
                    {/* The button base sets `whitespace-nowrap`, so line-clamp
                        cannot wrap and just severs the text - truncate gives it
                        an ellipsis instead. */}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-fg">{m.title}</span>
                      <span className="mt-hair block truncate text-sm font-normal text-fg-secondary">
                        {m.description}
                      </span>
                    </span>
                  </LinkButton>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </>
  )
}
