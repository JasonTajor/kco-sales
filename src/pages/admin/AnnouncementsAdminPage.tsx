import { useState } from 'react'
import { Megaphone, Send, Trash2 } from 'lucide-react'
import type { Announcement } from '@/types/resources'
import { resourceService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { StatRow, StatTile } from '@/components/common/StatTile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ContentStatusBadge } from '@/components/ui/status'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { TableSkeleton } from '@/components/ui/skeleton'
import {
  CardField,
  CardList,
  CardListItem,
  DataTable,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/format'

/**
 * Announcements (§35).
 *
 * Published announcements appear on every sales user's Notifications page,
 * filtered by audience and expiry in the RLS policy rather than in the client -
 * so an expired or draft announcement is not merely hidden, it is unreadable.
 */
export function AnnouncementsAdminPage() {
  const toast = useToast()
  const [editing, setEditing] = useState<Partial<Announcement> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [busy, setBusy] = useState(false)

  // `true` asks for drafts and expired rows too, which only an admin can read.
  const { data, loading, error, reload } = useAsync(() => resourceService.announcements(true), [])

  const rows = data ?? []
  const live = rows.filter(
    (a) => a.status === 'published' && (!a.expiresAt || new Date(a.expiresAt) > new Date()),
  ).length

  const save = async (draft: Partial<Announcement>) => {
    if (!draft.title?.trim()) {
      toast.error('An announcement needs a title.')
      return
    }
    setBusy(true)
    try {
      await resourceService.saveAnnouncement(draft)
      toast.success(draft.status === 'published' ? 'Announcement published' : 'Draft saved')
      setEditing(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the announcement.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await resourceService.deleteAnnouncement(deleteTarget.id)
      toast.success('Announcement deleted')
      setDeleteTarget(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Announcements"
        description="Short notices shown to the team on their notifications page."
        crumbs={[{ label: 'Administration' }, { label: 'Announcements' }]}
        actions={
          <Button onClick={() => setEditing({ priority: 'normal', status: 'draft', audience: ['sales'] })}>
            <Megaphone className="size-4" aria-hidden />
            New announcement
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Live now" value={live} hint="Published and not expired" />
        <StatTile
          label="Drafts"
          value={rows.filter((a) => a.status === 'draft').length}
          hint="Not yet visible"
        />
        <StatTile
          label="Critical"
          value={rows.filter((a) => a.priority === 'critical').length}
          tone={rows.some((a) => a.priority === 'critical' && a.status === 'published') ? 'warning' : 'neutral'}
          hint="Highest priority"
        />
        <StatTile label="Total" value={rows.length} hint="All time" />
      </StatRow>

      {error && <ErrorState description={error.message} onRetry={reload} />}
      {loading && !data && <TableSkeleton rows={4} />}

      {!loading && rows.length === 0 && !error && (
        <EmptyState
          icon={<Megaphone className="size-6" />}
          title="No announcements"
          description="Post one to tell the team about a new module, a policy change, or a training day."
          action={
            <Button onClick={() => setEditing({ priority: 'normal', status: 'draft', audience: ['sales'] })}>
              New announcement
            </Button>
          }
        />
      )}

      {rows.length > 0 && (
        <>
          <DataTable>
            <THead>
              <TR>
                <TH>Announcement</TH>
                <TH className="w-[8rem]">Priority</TH>
                <TH className="w-[9rem]">Audience</TH>
                <TH className="w-[8rem]">Status</TH>
                <TH className="w-[9rem]">Published</TH>
                <TH className="w-[4rem]">
                  <span className="sr-only">Actions</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((a) => (
                <TR key={a.id} onClick={() => setEditing(a)}>
                  <TD>
                    <span className="block font-bold text-fg">{a.title}</span>
                    <span className="mt-hair block max-w-prose truncate text-xs text-fg-tertiary">
                      {a.content}
                    </span>
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        a.priority === 'critical'
                          ? 'danger'
                          : a.priority === 'important'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {a.priority}
                    </Badge>
                  </TD>
                  <TD className="text-fg-secondary">{a.audience.join(', ')}</TD>
                  <TD>
                    <ContentStatusBadge status={a.status} />
                  </TD>
                  <TD className="text-fg-tertiary">
                    {a.publishedAt ? formatDate(a.publishedAt) : '—'}
                  </TD>
                  <TD>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${a.title}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(a)
                      }}
                    >
                      <Trash2 className="size-3.5 text-danger" />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>

          <CardList>
            {rows.map((a) => (
              <CardListItem key={a.id} title={a.title} onClick={() => setEditing(a)}>
                <CardField label="Priority">{a.priority}</CardField>
                <CardField label="Status">{a.status}</CardField>
                <CardField label="Audience">{a.audience.join(', ')}</CardField>
              </CardListItem>
            ))}
          </CardList>
        </>
      )}

      {editing && (
        <AnnouncementDialog
          draft={editing}
          busy={busy}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.title ?? ''}"?`}
        description="It disappears from everyone's notifications page. This one is a true delete rather than an archive - an announcement has no history worth keeping."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </Page>
  )
}

function AnnouncementDialog({
  draft,
  busy,
  onChange,
  onClose,
  onSave,
}: {
  draft: Partial<Announcement>
  busy: boolean
  onChange: (d: Partial<Announcement>) => void
  onClose: () => void
  onSave: (d: Partial<Announcement>) => void
}) {
  const patch = (p: Partial<Announcement>) => onChange({ ...draft, ...p })

  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={draft.id ? 'Edit announcement' : 'New announcement'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => onSave({ ...draft, status: 'draft' })}
            disabled={busy}
          >
            Save draft
          </Button>
          <Button onClick={() => onSave({ ...draft, status: 'published' })} disabled={busy}>
            <Send className="size-4" aria-hidden />
            Publish
          </Button>
        </>
      }
    >
      <div className="space-y-group">
        <div className="space-y-tight">
          <label htmlFor="ann-title" className="block text-xs font-bold text-fg-secondary">
            Title
          </label>
          <Input
            id="ann-title"
            value={draft.title ?? ''}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="New objection handling module is live"
            autoFocus
          />
        </div>

        <div className="space-y-tight">
          <label htmlFor="ann-body" className="block text-xs font-bold text-fg-secondary">
            Message
          </label>
          <Textarea
            id="ann-body"
            rows={5}
            value={draft.content ?? ''}
            onChange={(e) => patch({ content: e.target.value })}
            placeholder="Keep it short - this appears in a list."
          />
        </div>

        <div className="grid gap-tight sm:grid-cols-2">
          <div className="space-y-tight">
            <p className="text-xs font-bold text-fg-secondary">Priority</p>
            <Select
              ariaLabel="Priority"
              value={draft.priority ?? 'normal'}
              onValueChange={(v) => patch({ priority: v as Announcement['priority'] })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'important', label: 'Important' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
          </div>

          <div className="space-y-tight">
            <p className="text-xs font-bold text-fg-secondary">Audience</p>
            <Select
              ariaLabel="Audience"
              value={(draft.audience ?? ['sales']).join(',')}
              onValueChange={(v) =>
                patch({ audience: v.split(',') as Announcement['audience'] })
              }
              options={[
                { value: 'sales', label: 'Sales users' },
                { value: 'admin', label: 'Admins only' },
                { value: 'admin,sales', label: 'Everyone' },
              ]}
            />
          </div>
        </div>

        <div className="space-y-tight">
          <label htmlFor="ann-expires" className="block text-xs font-bold text-fg-secondary">
            Expires
          </label>
          <Input
            id="ann-expires"
            type="date"
            value={draft.expiresAt?.slice(0, 10) ?? ''}
            onChange={(e) =>
              patch({
                expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
          />
          <p className="text-2xs text-fg-tertiary">
            Leave blank to keep it up indefinitely. Past the expiry date the database stops
            returning it, so it disappears without needing to be unpublished.
          </p>
        </div>
      </div>
    </Dialog>
  )
}
