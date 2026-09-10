import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { BlockType, ContentBlock, Difficulty, Material, MaterialSection, Role, Team } from '@/types'
import { BLOCK_TYPES, TEAMS } from '@/types'
import { uid } from '@/lib/id'
import { cn } from '@/lib/cn'
import { useCategories } from '@/hooks/useCategories'
import { materialService } from '@/services'
import { BlockEditor } from './BlockEditor'
import { Block } from './BlockRenderer'
import { blockMeta, blockSummary, createBlock, duplicateBlock, move } from './blockFactory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Drawer } from '@/components/ui/drawer'
import {
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownTrigger,
} from '@/components/ui/dropdown'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SegmentedControl, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'

/**
 * §13 - structured content editor.
 *
 * Sections hold ordered blocks; blocks are edited in place and can be added,
 * reordered, duplicated, and removed. Preview reuses the exact renderer the
 * learner sees, so what an author previews is what ships.
 */
export function ContentEditor({
  material,
  actorId,
  onClose,
  onSaved,
}: {
  material: Material
  actorId: string
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const { categories } = useCategories()
  const [draft, setDraft] = useState<Material>(() => JSON.parse(JSON.stringify(material)))
  const [activeSectionId, setActiveSectionId] = useState(material.sections[0]?.id ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [openBlockId, setOpenBlockId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'section' | 'block'; id: string } | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(material)))
    setActiveSectionId(material.sections[0]?.id ?? '')
    setDirty(false)
  }, [material])

  const section = useMemo(
    () => draft.sections.find((s) => s.id === activeSectionId) ?? draft.sections[0],
    [draft.sections, activeSectionId],
  )

  const update = (fields: Partial<Material>) => {
    setDraft((d) => ({ ...d, ...fields }))
    setDirty(true)
  }

  const updateSections = (sections: MaterialSection[]) => {
    // Renumber so the viewer rail always reads 01, 02, 03…
    update({ sections: sections.map((s, i) => ({ ...s, index: String(i + 1).padStart(2, '0') })) })
  }

  const updateSection = (id: string, fields: Partial<MaterialSection>) => {
    updateSections(draft.sections.map((s) => (s.id === id ? { ...s, ...fields } : s)))
  }

  const addSection = () => {
    const created: MaterialSection = {
      id: uid('sec'),
      index: String(draft.sections.length + 1).padStart(2, '0'),
      title: 'Untitled section',
      summary: '',
      blocks: [],
    }
    updateSections([...draft.sections, created])
    setActiveSectionId(created.id)
  }

  const duplicateSection = (id: string) => {
    const src = draft.sections.find((s) => s.id === id)
    if (!src) return
    const copy: MaterialSection = {
      ...JSON.parse(JSON.stringify(src)),
      id: uid('sec'),
      title: `${src.title} (copy)`,
      blocks: src.blocks.map(duplicateBlock),
    }
    const at = draft.sections.findIndex((s) => s.id === id)
    const next = [...draft.sections]
    next.splice(at + 1, 0, copy)
    updateSections(next)
    setActiveSectionId(copy.id)
  }

  const removeSection = (id: string) => {
    const next = draft.sections.filter((s) => s.id !== id)
    updateSections(next)
    if (activeSectionId === id) setActiveSectionId(next[0]?.id ?? '')
    setConfirmDelete(null)
  }

  const addBlock = (type: BlockType) => {
    if (!section) return
    const block = createBlock(type)
    updateSection(section.id, { blocks: [...section.blocks, block] })
    setOpenBlockId(block.id)
  }

  const updateBlock = (blockId: string, next: ContentBlock) => {
    if (!section) return
    updateSection(section.id, { blocks: section.blocks.map((b) => (b.id === blockId ? next : b)) })
  }

  const moveBlock = (index: number, delta: number) => {
    if (!section) return
    updateSection(section.id, { blocks: move(section.blocks, index, index + delta) })
  }

  const save = async (status?: Material['status']) => {
    setSaving(true)
    try {
      const payload: Partial<Material> = { ...draft }
      if (status) payload.status = status
      await materialService.update(draft.id, payload, actorId)
      setDirty(false)
      onSaved()
      toast.success(
        status === 'published'
          ? 'Material published'
          : status === 'archived'
            ? 'Material archived'
            : 'Draft saved',
        `${draft.title} · v${draft.version + 1}`,
      )
      if (status) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Drawer
        open
        onOpenChange={(v) => !v && onClose()}
        title={draft.title || 'Untitled material'}
        description={`Module ${draft.moduleNumber} · ${draft.sections.length} sections · v${draft.version}`}
        width="xl"
        footer={
          <>
            {dirty && <span className="mr-auto text-sm text-warning-fg">Unsaved changes</span>}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="secondary" size="sm" loading={saving} onClick={() => save()}>
              Save draft
            </Button>
            {draft.status !== 'published' ? (
              <Button variant="primary" size="sm" loading={saving} onClick={() => save('published')}>
                Publish
              </Button>
            ) : (
              <Button variant="secondary" size="sm" loading={saving} onClick={() => save('archived')}>
                Archive
              </Button>
            )}
          </>
        }
      >
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* ------------------------------ Content ------------------------------ */}
          <TabsContent value="content">
            <div className="mb-snug flex items-center justify-between gap-tight">
              <SegmentedControl
                ariaLabel="Editor mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'edit', label: 'Edit', icon: <Pencil className="size-3" /> },
                  { value: 'preview', label: 'Preview', icon: <Eye className="size-3" /> },
                ]}
              />
              <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={addSection}>
                Add section
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-rhythm lg:grid-cols-[180px_minmax(0,1fr)]">
              {/* Section rail */}
              <nav aria-label="Sections">
                <ol className="space-y-px">
                  {draft.sections.map((s, i) => (
                    <li key={s.id} className="group flex items-center gap-hair">
                      <button
                        type="button"
                        onClick={() => setActiveSectionId(s.id)}
                        aria-current={s.id === activeSectionId ? 'true' : undefined}
                        className={cn(
                          'flex min-w-0 flex-1 items-center gap-tight rounded-md px-tight py-tight text-left text-sm transition-colors',
                          s.id === activeSectionId
                            ? 'bg-surface-active text-fg'
                            : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
                        )}
                      >
                        <span className="font-mono text-2xs text-fg-tertiary">{s.index}</span>
                        <span className="truncate">{s.title}</span>
                      </button>
                      <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Tooltip content="Move up">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move ${s.title} up`}
                            disabled={i === 0}
                            onClick={() => updateSections(move(draft.sections, i, i - 1))}
                          >
                            <ChevronUp className="size-3" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Move down">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move ${s.title} down`}
                            disabled={i === draft.sections.length - 1}
                            onClick={() => updateSections(move(draft.sections, i, i + 1))}
                          >
                            <ChevronDown className="size-3" />
                          </Button>
                        </Tooltip>
                      </div>
                    </li>
                  ))}
                </ol>

                {draft.sections.length === 0 && (
                  <p className="px-tight py-snug text-sm text-fg-tertiary">
                    No sections yet. Add one to start writing.
                  </p>
                )}
              </nav>

              {/* Section body */}
              {section ? (
                <div className="min-w-0 space-y-group">
                  {mode === 'edit' ? (
                    <>
                      <div className="space-y-snug chunk p-card">
                        <Field label="Section title" required>
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          />
                        </Field>
                        <Field label="Summary" hint="One line shown under the title in the viewer.">
                          <Input
                            value={section.summary ?? ''}
                            onChange={(e) => updateSection(section.id, { summary: e.target.value })}
                          />
                        </Field>
                        <div className="flex gap-tight border-t border-line pt-snug">
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={<Copy className="size-3" />}
                            onClick={() => duplicateSection(section.id)}
                          >
                            Duplicate section
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={<Trash2 className="size-3" />}
                            onClick={() => setConfirmDelete({ kind: 'section', id: section.id })}
                          >
                            Delete section
                          </Button>
                        </div>
                      </div>

                      <ul className="space-y-tight">
                        {section.blocks.map((block, i) => {
                          const isOpen = openBlockId === block.id
                          return (
                            <li key={block.id} className="chunk">
                              <div className="flex items-center gap-tight px-snug py-tight">
                                <Badge tone="neutral">{blockMeta[block.type as BlockType]?.label ?? block.type}</Badge>
                                <button
                                  type="button"
                                  onClick={() => setOpenBlockId(isOpen ? null : block.id)}
                                  className="min-w-0 flex-1 truncate text-left text-sm text-fg-secondary hover:text-fg"
                                  aria-expanded={isOpen}
                                >
                                  {blockSummary(block)}
                                </button>

                                <Tooltip content="Move up">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Move block up"
                                    disabled={i === 0}
                                    onClick={() => moveBlock(i, -1)}
                                  >
                                    <ChevronUp className="size-3.5" />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Move down">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Move block down"
                                    disabled={i === section.blocks.length - 1}
                                    onClick={() => moveBlock(i, 1)}
                                  >
                                    <ChevronDown className="size-3.5" />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Duplicate">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Duplicate block"
                                    onClick={() => {
                                      const next = [...section.blocks]
                                      next.splice(i + 1, 0, duplicateBlock(block))
                                      updateSection(section.id, { blocks: next })
                                    }}
                                  >
                                    <Copy className="size-3.5" />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Delete">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Delete block"
                                    onClick={() => setConfirmDelete({ kind: 'block', id: block.id })}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={isOpen ? 'Collapse block' : 'Edit block'}
                                  onClick={() => setOpenBlockId(isOpen ? null : block.id)}
                                >
                                  {isOpen ? <ChevronUp className="size-3.5" /> : <Pencil className="size-3.5" />}
                                </Button>
                              </div>

                              {isOpen && (
                                <div className="border-t border-line px-snug py-snug">
                                  <BlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} />
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>

                      {section.blocks.length === 0 && (
                        <p className="rounded-lg border border-dashed border-line-strong px-snug py-6 text-center text-sm text-fg-tertiary">
                          This section is empty. Add your first block below.
                        </p>
                      )}

                      <DropdownMenu>
                        <DropdownTrigger asChild>
                          <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />}>
                            Add block
                          </Button>
                        </DropdownTrigger>
                        <DropdownContent align="start" className="max-h-80 overflow-y-auto">
                          <DropdownLabel>Block type</DropdownLabel>
                          {BLOCK_TYPES.map((t) => (
                            <DropdownItem key={t} onSelect={() => addBlock(t)}>
                              <span className="flex flex-col">
                                <span>{blockMeta[t].label}</span>
                                <span className="text-xs text-fg-tertiary">{blockMeta[t].hint}</span>
                              </span>
                            </DropdownItem>
                          ))}
                        </DropdownContent>
                      </DropdownMenu>
                    </>
                  ) : (
                    <article className="chunk p-card">
                      <p className="font-mono text-sm text-fg-tertiary">{section.index}</p>
                      <h3 className="mt-hair text-2xl font-semibold tracking-[-0.02em] text-fg">{section.title}</h3>
                      {section.summary && <p className="mt-hair text-md text-fg-secondary">{section.summary}</p>}
                      <div className="mt-group space-y-group">
                        {section.blocks.map((b) => (
                          <Block key={b.id} block={b} />
                        ))}
                        {section.blocks.length === 0 && (
                          <p className="text-sm text-fg-tertiary">Nothing to preview yet.</p>
                        )}
                      </div>
                    </article>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line-strong px-snug py-8 text-center text-sm text-fg-tertiary">
                  Add a section to start writing this material.
                </p>
              )}
            </div>
          </TabsContent>

          {/* ------------------------------ Details ------------------------------ */}
          <TabsContent value="details">
            <div className="space-y-group">
              <Field label="Title" required>
                <Input value={draft.title} onChange={(e) => update({ title: e.target.value })} />
              </Field>

              <Field label="Description" hint="Shown on cards and at the top of the viewer.">
                <Textarea
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={3}
                />
              </Field>

              <div className="grid grid-cols-1 gap-snug sm:grid-cols-2">
                <Field label="Category">
                  <Select
                    value={draft.categoryId}
                    onValueChange={(v) => update({ categoryId: v })}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    className="w-full"
                  />
                </Field>
                <Field label="Difficulty">
                  <Select
                    value={draft.difficulty}
                    onValueChange={(v) => update({ difficulty: v as Difficulty })}
                    options={[
                      { value: 'foundation', label: 'Foundation' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' },
                    ]}
                    className="w-full"
                  />
                </Field>
                <Field label="Estimated duration" hint="Minutes">
                  <Input
                    type="number"
                    min={1}
                    value={draft.duration}
                    onChange={(e) => update({ duration: Number(e.target.value) || 1 })}
                  />
                </Field>
                <Field label="Module number">
                  <Input
                    type="number"
                    min={1}
                    value={draft.moduleNumber}
                    onChange={(e) => update({ moduleNumber: Number(e.target.value) || 1 })}
                  />
                </Field>
              </div>

              <Field label="Tags" hint="Comma separated.">
                <Input
                  value={draft.tags.join(', ')}
                  onChange={(e) =>
                    update({
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim().toLowerCase())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>

              <fieldset className="space-y-tight">
                <legend className="text-sm font-medium text-fg">Audience</legend>
                {(['sales', 'admin'] as Role[]).map((r) => (
                  <Checkbox
                    key={r}
                    label={r === 'admin' ? 'Administrators' : 'Sales users'}
                    checked={draft.audience.includes(r)}
                    onCheckedChange={(v) =>
                      update({
                        audience: v ? [...draft.audience, r] : draft.audience.filter((x) => x !== r),
                      })
                    }
                  />
                ))}
              </fieldset>

              <fieldset className="space-y-tight">
                <legend className="text-sm font-medium text-fg">Teams</legend>
                <div className="grid grid-cols-1 gap-tight sm:grid-cols-2">
                  {TEAMS.map((t) => (
                    <Checkbox
                      key={t}
                      label={t}
                      checked={draft.teams.includes(t)}
                      onCheckedChange={(v) =>
                        update({
                          teams: v ? [...draft.teams, t as Team] : draft.teams.filter((x) => x !== t),
                        })
                      }
                    />
                  ))}
                </div>
              </fieldset>

              <div className="border-t border-line pt-group">
                <Checkbox
                  label="Contains claim-sensitive guidance"
                  description="Flags the material for Admin review and shows an illustrative-only notice to learners. Required whenever content discusses earnings, ROI, or market performance."
                  checked={Boolean(draft.needsClaimReview)}
                  onCheckedChange={(v) => update({ needsClaimReview: v })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={confirmDelete?.kind === 'section' ? 'Delete this section?' : 'Delete this block?'}
        description={
          confirmDelete?.kind === 'section'
            ? 'The section and every block inside it are removed. This cannot be undone once you save.'
            : 'This block is removed from the section. This cannot be undone once you save.'
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!confirmDelete) return
          if (confirmDelete.kind === 'section') removeSection(confirmDelete.id)
          else if (section) {
            updateSection(section.id, { blocks: section.blocks.filter((b) => b.id !== confirmDelete.id) })
            setConfirmDelete(null)
          }
        }}
      />
    </>
  )
}
