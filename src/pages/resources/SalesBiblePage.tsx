import { useState } from 'react'
import { AlertTriangle, Check, Loader2, Pencil, ShieldAlert } from 'lucide-react'
import type { SalesBibleEntry, SalesBibleSection } from '@/types/resources'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAsync } from '@/hooks/useAsync'
import { resourceService } from '@/services'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Input, Textarea } from '@/components/ui/input'
import { ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'

/**
 * The Sales Bible (§45).
 *
 * This page is mostly empty, and that is the point.
 *
 * The brief lists the fields a Sales Bible should hold - flavours, pack sizes,
 * package prices, SRP, delivery terms - and none of the actual values were
 * supplied. §78 is unambiguous about what to do: show that the field is not
 * configured, never invent a figure. An agent reading a made-up price would
 * quote it to a customer, and a made-up SRP is a commercial problem, not a
 * cosmetic one.
 *
 * So every unset field says so, in place, with the specific reason. An admin
 * fills it in here and marks it verified; only then does it read as fact.
 */
export function SalesBiblePage() {
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(() => resourceService.salesBible(), [])

  const sections = data ?? []
  const allEntries = sections.flatMap((s) => s.entries)
  const configured = allEntries.filter((e) => e.value !== null).length
  const needsApproval = allEntries.filter((e) => e.requiresApproval).length

  return (
    <Page>
      <PageHeader
        title="Sales Bible"
        description="The single reference for product facts, reseller pricing and the answers customers ask for most."
        crumbs={[{ label: 'Sales resources', to: '/resources/objections' }, { label: 'Sales Bible' }]}
        meta={
          !loading && sections.length > 0 ? (
            <>
              <Badge tone={configured === allEntries.length ? 'success' : 'warning'}>
                {configured} of {allEntries.length} fields configured
              </Badge>
              {needsApproval > 0 && (
                <Badge tone="neutral">
                  <ShieldAlert className="size-3" aria-hidden />
                  {needsApproval} need approval
                </Badge>
              )}
            </>
          ) : undefined
        }
      />

      {/* Stated once, at the top, rather than repeated on every empty field. */}
      <Callout variant="warning" title="Verify before you quote">
        Only fields marked <strong>Verified</strong> have been confirmed by management. Anything
        showing <em>Admin content required</em> has no approved value yet - do not estimate it, and
        do not quote a figure to a customer from memory. Ask your supervisor.
      </Callout>

      {error && <ErrorState description={error.message} onRetry={reload} />}

      {loading && (
        <div className="space-y-rhythm">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[240px] rounded-lg" />
          ))}
        </div>
      )}

      {!loading &&
        !error &&
        sections.map((section) => (
          <BibleSection key={section.id} section={section} isAdmin={isAdmin} onSaved={reload} />
        ))}
    </Page>
  )
}

function BibleSection({
  section,
  isAdmin,
  onSaved,
}: {
  section: SalesBibleSection
  isAdmin: boolean
  onSaved: () => void
}) {
  const missing = section.entries.filter((e) => e.value === null).length

  return (
    <Card>
      <CardHeader
        title={section.title}
        description={section.summary}
        action={
          missing > 0 ? (
            <Badge tone="warning">{missing} unconfigured</Badge>
          ) : (
            <Badge tone="success">
              <Check className="size-3" aria-hidden />
              Complete
            </Badge>
          )
        }
      />
      <ul className="divide-y divide-line">
        {section.entries.map((entry) => (
          <BibleRow key={entry.id} entry={entry} isAdmin={isAdmin} onSaved={onSaved} />
        ))}
      </ul>
    </Card>
  )
}

function BibleRow({
  entry,
  isAdmin,
  onSaved,
}: {
  entry: SalesBibleEntry
  isAdmin: boolean
  onSaved: () => void
}) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(entry.value ?? '')
  const [detail, setDetail] = useState(entry.detail)
  const [verified, setVerified] = useState(entry.verified)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await resourceService.saveBibleEntry(entry.id, { value, detail, verified })
      toast.success(`${entry.label} updated`)
      setEditing(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that field.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="space-y-tight bg-surface-hover p-card">
        <p className="text-sm font-medium text-fg">{entry.label}</p>

        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Leave blank to keep this field unconfigured"
          aria-label={`${entry.label} value`}
        />

        <Textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={2}
          placeholder="Guidance for the agent reading this"
          aria-label={`${entry.label} detail`}
        />

        <label className="flex items-start gap-tight text-sm text-fg">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span>
            Verified by management
            <span className="block text-xs text-fg-tertiary">
              Only tick this once the value has actually been confirmed. Agents are told they may
              quote verified fields.
            </span>
          </span>
        </label>

        <div className="flex items-center gap-tight pt-hair">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </li>
    )
  }

  const unset = entry.value === null

  return (
    <li className="flex items-start gap-group px-card py-tight">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-tight">
          <p className="text-sm font-medium text-fg">{entry.label}</p>
          {entry.verified && !unset && (
            <Badge tone="success">
              <Check className="size-3" aria-hidden />
              Verified
            </Badge>
          )}
          {!entry.verified && !unset && <Badge tone="warning">Unverified</Badge>}
          {entry.requiresApproval && (
            <Badge tone="neutral">
              <ShieldAlert className="size-3" aria-hidden />
              Needs approval
            </Badge>
          )}
        </div>

        {unset ? (
          <p className="mt-hair flex items-start gap-hair text-sm text-warning-fg">
            <AlertTriangle className="mt-px size-3.5 flex-none" aria-hidden />
            <span>
              <span className="font-medium">Admin content required.</span>{' '}
              <span className="text-fg-secondary">{entry.detail}</span>
            </span>
          </p>
        ) : (
          <>
            <p className={cn('mt-hair text-sm', entry.verified ? 'text-fg' : 'text-fg-secondary')}>
              {entry.value}
            </p>
            {entry.detail && <p className="mt-hair text-xs text-fg-tertiary">{entry.detail}</p>}
          </>
        )}
      </div>

      {isAdmin && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setValue(entry.value ?? '')
            setDetail(entry.detail)
            setVerified(entry.verified)
            setEditing(true)
          }}
          aria-label={`Edit ${entry.label}`}
        >
          <Pencil className="size-3.5" aria-hidden />
        </Button>
      )}
    </li>
  )
}
