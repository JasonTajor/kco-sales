import { useState } from 'react'
import { FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Category, Material } from '@/types'
import type { EmojiName } from '@/data/emoji'
import { materialService } from '@/services'
import { invalidateCategories } from '@/hooks/useCategories'
import { useAsync } from '@/hooks/useAsync'
import { plural } from '@/lib/format'
import { categoryAccent, categoryEmoji, type Accent } from '@/utils'
import { EmojiTile } from '@/components/common/EmojiTile'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardField, CardList, CardListItem, DataTable, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { ErrorState } from '@/components/ui/states'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

const accentOptions: { value: Accent; label: string }[] = [
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'amber', label: 'Amber' },
  { value: 'violet', label: 'Violet' },
  { value: 'rose', label: 'Rose' },
  { value: 'slate', label: 'Slate' },
]

/** The animated emoji a category may wear. Named, because colour is not enough. */
const iconOptions: { value: EmojiName; label: string }[] = [
  { value: 'speaking', label: 'Speaking head' },
  { value: 'chat', label: 'Speech balloon' },
  { value: 'callMe', label: 'Call me' },
  { value: 'finish', label: 'Chequered flag' },
  { value: 'muscle', label: 'Flexed biceps' },
  { value: 'grad', label: 'Graduation cap' },
  { value: 'bolt', label: 'High voltage' },
  { value: 'books', label: 'Books' },
  { value: 'goal', label: 'Direct hit' },
  { value: 'handshake', label: 'Handshake' },
  { value: 'brain', label: 'Brain' },
  { value: 'idea', label: 'Light bulb' },
]

export function AdminCategoriesPage() {
  const toast = useToast()
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync<{ categories: Category[]; materials: Material[] }>(async () => {
    const [cats, mats] = await Promise.all([
      materialService.categories(),
      materialService.list({ status: 'all' }),
    ])
    return { categories: cats, materials: mats }
  }, [])

  const countFor = (id: string) => (data?.materials ?? []).filter((m) => m.categoryId === id).length

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(true)
    await materialService.deleteCategory(deleteTarget.id)
    invalidateCategories()
    setBusy(false)
    toast.success('Category deleted', deleteTarget.name)
    setDeleteTarget(null)
    reload()
  }

  return (
    <Page className="max-w-[1080px]">
      <PageHeader
        title="Categories"
        description="The subject areas materials are filed under. Renaming one updates it everywhere."
        crumbs={[{ label: 'Administration' }, { label: 'Categories' }]}
        actions={
          <Button variant="primary" size="sm" icon={<FolderPlus className="size-3.5" />} onClick={() => setCreating(true)}>
            New category
          </Button>
        }
      />

      {error && <ErrorState onRetry={reload} />}
      {loading && !data && <TableSkeleton rows={6} cols={4} />}

      {data && (
        <Card className="overflow-hidden p-0">
          <DataTable>
            <THead>
              <TR>
                <TH>Category</TH>
                <TH width="140px">Slug</TH>
                <TH width="110px" className="text-right">
                  Materials
                </TH>
                <TH width="48px">
                  <span className="sr-only">Actions</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {data.categories.map((c) => {
                const accent = categoryAccent(c.accent)
                const emoji = categoryEmoji(c.icon)
                const count = countFor(c.id)
                return (
                  <TR key={c.id}>
                    <TD>
                      <div className="flex items-start gap-snug">
                        <EmojiTile name={emoji} tone={accent.tile} size="xs" />
                        <div className="min-w-0">
                          <p className="font-medium text-fg">{c.name}</p>
                          <p className="mt-hair line-clamp-1 text-2xs text-fg-tertiary">{c.description}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <code className="rounded-sm bg-neutral-subtle px-hair py-0.5 font-mono text-xs text-fg-secondary">
                        {c.slug}
                      </code>
                    </TD>
                    <TD className="text-right">
                      <span className="text-sm text-fg-secondary tnum">{count}</span>
                    </TD>
                    <TD>
                      <DropdownMenu>
                        <DropdownTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem icon={<Pencil className="size-4" />} onSelect={() => setEditing(c)}>
                            Edit
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem
                            icon={<Trash2 className="size-4" />}
                            destructive
                            disabled={count > 0}
                            onSelect={() => setDeleteTarget(c)}
                          >
                            {count > 0 ? `In use by ${plural(count, 'material')}` : 'Delete'}
                          </DropdownItem>
                        </DropdownContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </DataTable>

          <CardList className="p-card">
            {data.categories.map((c) => {
              const emoji = categoryEmoji(c.icon)
              const accent = categoryAccent(c.accent)
              return (
                <CardListItem key={c.id}>
                  <div className="flex items-start gap-snug">
                    <EmojiTile name={emoji} tone={accent.tile} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-base font-semibold text-fg">{c.name}</p>
                    <span className="shrink-0 text-sm text-fg-tertiary">{plural(countFor(c.id), 'material')}</span>
                  </div>
                  <p className="mt-hair text-sm text-fg-secondary">{c.description}</p>
                  <div className="mt-snug border-t border-line pt-tight">
                    <CardField label="Slug">
                      <span className="font-mono text-sm">{c.slug}</span>
                    </CardField>
                  </div>
                </CardListItem>
              )
            })}
          </CardList>
        </Card>
      )}

      <CategoryDialog
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        category={editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false)
            setEditing(null)
          }
        }}
        onSaved={() => {
          setCreating(false)
          setEditing(null)
          reload()
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this category?"
        description={
          deleteTarget
            ? `${deleteTarget.name} is removed from the filter lists. Only empty categories can be deleted.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={() => void remove()}
      />
    </Page>
  )
}

function CategoryDialog({
  open,
  category,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  category: Category | null
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [accent, setAccent] = useState<Accent>(category?.accent ?? 'slate')
  const [icon, setIcon] = useState(category?.icon ?? 'bolt')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const nameError = touched && !name.trim() ? 'Enter a category name' : undefined

  const submit = async () => {
    setTouched(true)
    if (!name.trim()) return
    setSaving(true)
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    if (category) {
      await materialService.updateCategory(category.id, { name: name.trim(), description, accent, icon, slug })
      invalidateCategories()
      toast.success('Category updated', name.trim())
    } else {
      await materialService.createCategory({ name: name.trim(), description, accent, icon, slug })
      invalidateCategories()
      toast.success('Category created', name.trim())
    }
    setSaving(false)
    onSaved()
  }

  const preview = categoryAccent(accent)
  const previewEmoji = categoryEmoji(icon)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? 'Edit category' : 'New category'}
      description="Colour and icon are identity only - every surface also shows the name."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void submit()}>
            {category ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <div className="space-y-group py-tight">
        <Field label="Name" required error={nameError} htmlFor="cat-name">
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={Boolean(nameError)}
            placeholder="Phone Skills"
          />
        </Field>

        <Field label="Description" htmlFor="cat-desc">
          <Textarea
            id="cat-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What belongs in this category."
          />
        </Field>

        <div className="grid grid-cols-1 gap-group sm:grid-cols-2">
          <Field label="Accent" htmlFor="cat-accent">
            <Select
              value={accent}
              onValueChange={(v) => setAccent(v as Accent)}
              ariaLabel="Accent colour"
              options={accentOptions}
            />
          </Field>
          <Field label="Icon" htmlFor="cat-icon">
            <Select value={icon} onValueChange={setIcon} ariaLabel="Icon" options={iconOptions} />
          </Field>
        </div>

        <div className="flex items-center gap-snug rounded-md bg-bg-inset p-card">
          <EmojiTile name={previewEmoji} tone={preview.tile} size="sm" play="loop" />
          <div className="min-w-0">
            <p className="text-base font-medium text-fg">{name.trim() || 'Category name'}</p>
            <p className="text-2xs text-fg-tertiary">Preview</p>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
