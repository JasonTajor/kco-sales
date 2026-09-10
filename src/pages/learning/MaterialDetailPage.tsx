import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, RotateCcw, Star } from 'lucide-react'
import type { Material, MaterialProgress } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  assessmentService,
  gamificationService,
  materialService,
  progressService,
} from '@/services'
import { useCategories } from '@/hooks/useCategories'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { formatDate, formatDuration, pct } from '@/lib/format'
import { categoryAccent, categoryEmoji } from '@/utils'
import { Emoji } from '@/components/common/Emoji'
import { RewardFeedback } from '@/components/gamification/RewardFeedback'
import { XPBadge } from '@/components/gamification/Stats'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Blocks } from '@/components/content/BlockRenderer'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { ProgressBar } from '@/components/ui/progress'
import { DifficultyBadge } from '@/components/ui/status'
import { ErrorState } from '@/components/ui/states'
import { MaterialSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function MaterialDetailPage() {
  const { byId: categoriesById } = useCategories()
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const userId = user!.id
  const toast = useToast()

  const { data, loading, error, reload } = useAsync<{ material: Material | null; progress: MaterialProgress | null }>(
    async () => {
      const material = await materialService.get(slug)
      if (!material) return { material: null, progress: null }
      const progress = await progressService.openMaterial(userId, material.id)
      return { material, progress }
    },
    [slug, userId],
  )

  const [progress, setProgress] = useState<MaterialProgress | null>(null)
  useEffect(() => setProgress(data?.progress ?? null), [data])

  const material = data?.material ?? null

  const [activeSection, setActiveSection] = useState<string | null>(null)
  // Reward feedback for the section just completed. Non-blocking by design.
  const sectionRefs = useRef(new Map<string, HTMLElement>())

  // The rail follows the reader rather than the click, so scrolling by wheel
  // keeps the index honest.
  useEffect(() => {
    if (!material) return
    const root = document.getElementById('app-main')
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveSection(visible.target.id.replace('section-', ''))
      },
      { root, rootMargin: '-72px 0px -60% 0px', threshold: 0 },
    )
    for (const el of sectionRefs.current.values()) observer.observe(el)
    return () => observer.disconnect()
  }, [material])

  const registerSection = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el)
    else sectionRefs.current.delete(id)
  }, [])

  /** The XP burst shown after a section is ticked off. Cleared by the toast. */
  const [reward, setReward] = useState<{ xp: number; title: string } | null>(null)

  const toggleSection = async (sectionId: string) => {
    if (!material) return
    const wasComplete = progress?.completedSectionIds.includes(sectionId) ?? false
    const next = await progressService.toggleSection(userId, material, sectionId)
    setProgress(next)

    if (wasComplete) return
    const { XP_PER_SECTION, XP_MATERIAL_BONUS } = gamificationService.constants
    if (next.state === 'completed') {
      setReward({ xp: XP_PER_SECTION + XP_MATERIAL_BONUS, title: `${material.title} complete` })
    } else {
      setReward({ xp: XP_PER_SECTION, title: 'Section complete' })
    }
  }

  const toggleFavorite = async () => {
    if (!material) return
    const next = await progressService.toggleFavorite(userId, material.id)
    setProgress(next)
    toast.success(next.favorite ? 'Added to favourites' : 'Removed from favourites')
  }

  const resetProgress = async () => {
    if (!material) return
    await progressService.reset(userId, material.id)
    setProgress(await progressService.openMaterial(userId, material.id))
    toast.info('Progress reset', `${material.title} is back to not started.`)
  }

  /**
   * Previous/next in the library, and the assessment tied to this module.
   *
   * Both from the service. Reading the seed files meant the "next module" link
   * could point at something not in the database, and a learner would be shown
   * an assessment that no longer exists - or miss one an admin just published.
   */
  const libraryAsync = useAsync(() => materialService.list({ status: 'published' }), [])
  const assessmentsAsync = useAsync(() => assessmentService.list(), [])

  const siblings = useMemo(() => {
    if (!material) return { prev: null, next: null }
    const published = [...(libraryAsync.data ?? [])].sort(
      (a, b) => a.moduleNumber - b.moduleNumber,
    )
    const i = published.findIndex((m) => m.id === material.id)
    return { prev: published[i - 1] ?? null, next: published[i + 1] ?? null }
  }, [material, libraryAsync.data])

  const linkedAssessment = useMemo(
    () =>
      material
        ? (assessmentsAsync.data ?? []).find((a) => a.materialId === material.id)
        : undefined,
    [material, assessmentsAsync.data],
  )

  if (loading && !data) {
    return (
      <Page>
        <MaterialSkeleton />
      </Page>
    )
  }
  if (error) {
    return (
      <Page>
        <ErrorState onRetry={reload} />
      </Page>
    )
  }
  if (!material) return <NotFoundPage />

  const category = categoriesById(material.categoryId)
  const accent = categoryAccent(category?.accent)
  const done = progress?.completedSectionIds.length ?? 0
  const total = material.sections.length

  return (
    <Page className="max-w-[1400px]">
      <PageHeader
        crumbs={[
          { label: 'Learning' },
          { label: 'All Materials', to: '/learning/materials' },
          { label: material.title },
        ]}
        title={material.title}
        description={material.description}
        meta={
          <>
            {category && (
              <span className={cn('inline-flex items-center gap-hair rounded-full px-tight py-0.5 text-2xs font-medium', accent.chip)}>
                <Emoji name={categoryEmoji(category.icon)} size={13} />
                {category.name}
              </span>
            )}
            <DifficultyBadge level={material.difficulty} />
            <XPBadge xp={gamificationService.pendingXp(userId, material)} size="sm" />
            <Badge tone="neutral">
              <Emoji name="hourglass" size={13} />
              {formatDuration(material.duration)}
            </Badge>
            <span className="text-2xs text-fg-tertiary">Module {material.moduleNumber}</span>
            <span className="text-2xs text-fg-tertiary">Updated {formatDate(material.updatedAt)}</span>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void toggleFavorite()}
              aria-pressed={progress?.favorite ?? false}
              icon={<Star className={cn('size-3.5', progress?.favorite && 'fill-warning text-warning')} />}
            >
              {progress?.favorite ? 'Favourited' : 'Favourite'}
            </Button>
            {done > 0 && (
              <Button variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={() => void resetProgress()}>
                Reset
              </Button>
            )}
          </>
        }
      />

      {material.needsClaimReview && (
        <Callout variant="warning" title="Contains figures under review">
          Numbers in this material are illustrative examples for training. Do not quote them to a customer as a
          guaranteed return.
        </Callout>
      )}

      <div className="grid grid-cols-1 gap-rhythm lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="chunk p-card">
            <div className="flex items-baseline justify-between">
              <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">Sections</p>
              <p className="text-2xs text-fg-tertiary tnum">
                {done}/{total}
              </p>
            </div>
            <ProgressBar
              value={pct(done, total)}
              tone={done === total ? 'success' : 'primary'}
              className="mt-tight"
              label="Material progress"
            />
            <ol className="mt-snug space-y-tight">
              {material.sections.map((s) => {
                const complete = progress?.completedSectionIds.includes(s.id) ?? false
                const active = activeSection === s.id
                return (
                  <li key={s.id}>
                    <a
                      href={`#section-${s.id}`}
                      className={cn(
                        'flex items-start gap-tight rounded-lg px-snug py-tight text-sm',
                        // The ring would vanish against the active item's fill at the global 1px offset.
                        'focus-visible:outline-offset-2',
                        active
                          ? // Same chunky active item as the sidebar - flat face over a solid lip -
                            // but in the KCO wordmark yellow, so the section menu never reads as
                            // the shell navigation.
                            'btn-chunky btn-chunky-yellow font-semibold [--lip:3px]'
                          : 'text-fg-secondary transition-colors hover:bg-surface-hover hover:text-fg',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-px flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold tnum',
                          // On the yellow face the badge inverts to the same ink, solid, so it
                          // reads without a translucent tint over the fill.
                          active
                            ? 'bg-[var(--cta-fg)] text-[var(--cta)]'
                            : complete
                              ? 'bg-success text-white'
                              : 'bg-neutral-subtle text-fg-tertiary',
                        )}
                        aria-hidden
                      >
                        {complete ? <Check className="size-2.5" strokeWidth={3} /> : s.index}
                      </span>
                      <span className="min-w-0 leading-[1.35]">{s.title}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </div>

          {linkedAssessment && (
            <div className="mt-group chunk p-card">
              <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">Assessment</p>
              <p className="mt-hair text-base font-medium text-fg">{linkedAssessment.title}</p>
              <p className="mt-hair text-sm text-fg-secondary">
                {linkedAssessment.questions.length} questions · pass at {linkedAssessment.passingScore}%
              </p>
              <LinkButton
                to={`/training/assessments/${linkedAssessment.slug}`}
                variant="secondary"
                size="sm"
                className="mt-snug w-full"
                icon={<ClipboardCheck className="size-3.5" />}
              >
                Take assessment
              </LinkButton>
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-rhythm">
          {material.sections.map((s) => {
            const complete = progress?.completedSectionIds.includes(s.id) ?? false
            return (
              <section
                key={s.id}
                id={`section-${s.id}`}
                ref={(el) => registerSection(s.id, el)}
                className="scroll-mt-16"
              >
                <div className="mb-group flex items-start justify-between gap-group border-b border-line pb-snug">
                  <div className="min-w-0">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary tnum">
                      Section {s.index}
                    </p>
                    <h2 className="mt-hair text-xl font-semibold tracking-tight text-fg">{s.title}</h2>
                    {s.summary && <p className="mt-hair max-w-[64ch] text-base text-fg-secondary">{s.summary}</p>}
                  </div>
                  <Button
                    variant={complete ? 'subtle' : 'secondary'}
                    size="sm"
                    onClick={() => void toggleSection(s.id)}
                    aria-pressed={complete}
                    icon={complete ? <Check className="size-3.5 text-success" /> : undefined}
                    className="shrink-0"
                  >
                    {complete ? 'Completed' : 'Mark complete'}
                  </Button>
                </div>

                <Blocks blocks={s.blocks} />
              </section>
            )
          })}

          <nav className="flex items-center justify-between gap-snug border-t border-line pt-group" aria-label="Adjacent materials">
            {siblings.prev ? (
              <Link
                to={`/learning/materials/${siblings.prev.slug}`}
                className="group flex min-w-0 items-center gap-tight rounded-md px-tight py-tight text-left chunk-press hover:bg-surface-hover"
              >
                <ArrowLeft className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-2xs text-fg-tertiary">Previous</span>
                  <span className="block truncate text-base text-fg group-hover:text-primary">{siblings.prev.title}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {siblings.next && (
              <Link
                to={`/learning/materials/${siblings.next.slug}`}
                className="group flex min-w-0 items-center gap-tight rounded-md px-tight py-tight text-right chunk-press hover:bg-surface-hover"
              >
                <span className="min-w-0">
                  <span className="block text-2xs text-fg-tertiary">Next</span>
                  <span className="block truncate text-base text-fg group-hover:text-primary">{siblings.next.title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
              </Link>
            )}
          </nav>
        </div>
      </div>
      <RewardFeedback
        show={reward !== null}
        xp={reward?.xp ?? 0}
        title={reward?.title ?? ''}
        onDone={() => setReward(null)}
      />
    </Page>
  )
}
