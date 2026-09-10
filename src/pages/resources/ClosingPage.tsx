import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { materialService, resourceService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { ErrorState } from '@/components/ui/states'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Blocks } from '@/components/content/BlockRenderer'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { Emoji } from '@/components/common/Emoji'

/** Objections that are really "not yet" - the ones a close has to survive. */
const stallCategories = new Set(['timing', 'capital', 'risk'])

export function ClosingPage() {
  /**
   * Everything on this page is a view onto content that lives elsewhere: the
   * closing steps come from the Sales Call Structure module, the scripts from
   * quick reference, the stalls from the objection library.
   *
   * All three are fetched. Importing them meant this page kept showing the
   * seed text after an admin had edited the module it claims to quote - and
   * "one source of truth rather than a paraphrase that drifts" was exactly the
   * intention, so reading a copy defeated it.
   */
  const moduleAsync = useAsync(() => materialService.get('sales-call-structure'), [])
  const referenceAsync = useAsync(() => resourceService.quickReference(), [])
  const objectionsAsync = useAsync(() => resourceService.objections({}), [])

  // Steps 7 and 8 of the call are the close.
  const closingSections = (moduleAsync.data?.sections ?? []).filter(
    (sec) => sec.title.startsWith('Step 7') || sec.title.startsWith('Step 8'),
  )

  const card = (referenceAsync.data ?? []).find((c) => c.slug === 'closing-scripts')
  const stalls = (objectionsAsync.data ?? []).filter((o) => stallCategories.has(o.category))

  const loading = moduleAsync.loading && !moduleAsync.data
  const error = moduleAsync.error ?? referenceAsync.error ?? objectionsAsync.error

  return (
    <Page>
      <PageHeader
        title="Closing Techniques"
        description="A close is a specific, small, dated next step - not a question about interest."
        crumbs={[{ label: 'Sales Resources' }, { label: 'Closing Techniques' }]}
        actions={
          <LinkButton to="/learning/materials/sales-call-structure" variant="secondary" size="sm">
            Read the module
          </LinkButton>
        }
      />

      {error && <ErrorState description={error.message} onRetry={moduleAsync.reload} />}
      {loading && !error && <CardGridSkeleton count={3} />}

      <Callout variant="info" title="The rule">
        Ask for one specific thing, make it small, attach a date - then stop talking. Silence after a close belongs to
        the customer.
      </Callout>

      {card && (
        <Card className="p-0">
          <CardHeader title={card.title} description={card.kicker} action={<Badge tone="neutral">{card.kind}</Badge>} />
          <div className="p-card">
            <Blocks blocks={card.blocks} />
          </div>
        </Card>
      )}

      {closingSections.map((section) => (
        <section key={section.id}>
          <div className="mb-group border-b border-line pb-snug">
            <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary tnum">
              Sales Call Structure · Section {section.index}
            </p>
            <h2 className="mt-hair text-xl font-semibold tracking-tight text-fg">{section.title}</h2>
            {section.summary && <p className="mt-hair max-w-[64ch] text-base text-fg-secondary">{section.summary}</p>}
          </div>
          <Blocks blocks={section.blocks} />
        </section>
      ))}

      <section>
        <Card className="p-0">
          <CardHeader
            title="When the close does not land"
            description="The stalls that show up right after you ask."
            action={
              <LinkButton to="/resources/objections" variant="ghost" size="sm" trailing={<ArrowRight className="size-3.5" />}>
                All objections
              </LinkButton>
            }
          />
          <ul className="divide-y divide-[var(--border)]">
            {stalls.map((o) => (
              <li key={o.id}>
                <Link
                  to="/resources/objections"
                  className="flex items-start gap-snug p-card transition-colors hover:bg-surface-hover"
                >
                  <Emoji name="goal" size={15} className="mt-hair" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium text-fg">“{o.objection}”</span>
                    <span className="mt-hair line-clamp-2 block text-sm text-fg-secondary">{o.close}</span>
                  </span>
                  <ArrowRight className="mt-hair size-3.5 shrink-0 text-fg-tertiary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </Page>
  )
}
