import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Search, X } from 'lucide-react'
import type { Difficulty, Material, MaterialProgress } from '@/types'
import { Stagger, StaggerItem } from '@/components/motion/Motion'
import { useAuth } from '@/features/auth/AuthProvider'
import { materialService, progressService } from '@/services'
import type { MaterialFilters } from '@/services/materialService'
import { useCategories } from '@/hooks/useCategories'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { plural } from '@/lib/format'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { MaterialCard, MaterialRow } from '@/components/common/MaterialCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ui/states'
import { MascotEmptyState } from '@/components/gamification/Mascot'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'

type Completion = NonNullable<MaterialFilters['completion']>
type View = 'grid' | 'list'

const difficultyOptions = [
  { value: 'all', label: 'All levels' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const completionOptions = [
  { value: 'all', label: 'All materials' },
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'favorites', label: 'Favourites' },
]

const sortOptions = [
  { value: 'module', label: 'Module order' },
  { value: 'title', label: 'Title A - Z' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'duration', label: 'Shortest first' },
]

export function MaterialsPage() {
  const { categories } = useCategories()
  const { user } = useAuth()
  const userId = user!.id
  const toast = useToast()

  // Deep link from the Categories page: /learning/materials?category=cat-phone
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryIdState] = useState(searchParams.get('category') ?? 'all')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [completion, setCompletion] = useState<Completion>('all')
  const [sortBy, setSortBy] = useState<NonNullable<MaterialFilters['sortBy']>>('module')
  const [view, setView] = useLocalStorage<View>('kco.materials.view', 'grid')

  const setCategoryId = (value: string) => {
    setCategoryIdState(value)
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('category')
    else next.set('category', value)
    setSearchParams(next, { replace: true })
  }

  const debounced = useDebounce(search, 200)

  const { data, loading, error, reload, setData } = useAsync<{
    rows: Material[]
    progress: MaterialProgress[]
  }>(async () => {
    const [rows, progress] = await Promise.all([
      materialService.list({
        search: debounced,
        categoryId,
        difficulty,
        completion,
        sortBy,
        userId,
        status: 'published',
        audience: user!.role,
      }),
      progressService.forUser(userId),
    ])
    return { rows, progress }
  }, [debounced, categoryId, difficulty, completion, sortBy, userId])

  const progressByMaterial = useMemo(() => {
    const map = new Map<string, MaterialProgress>()
    for (const p of data?.progress ?? []) map.set(p.materialId, p)
    return map
  }, [data])

  const filtersActive = categoryId !== 'all' || difficulty !== 'all' || completion !== 'all' || search !== ''

  const clearFilters = () => {
    setSearch('')
    setCategoryId('all')
    setDifficulty('all')
    setCompletion('all')
  }

  const toggleFavorite = async (materialId: string) => {
    const next = await progressService.toggleFavorite(userId, materialId)
    setData((prev) => {
      const rows = prev?.rows ?? []
      const progress = (prev?.progress ?? []).filter((p) => p.materialId !== materialId)
      return { rows, progress: [...progress, next] }
    })
    toast.success(next.favorite ? 'Added to favourites' : 'Removed from favourites')
  }

  const rows = data?.rows ?? []

  return (
    <Page>
      <PageHeader
        title="All Materials"
        description="Every published module, searchable by topic, level, and where you left off."
        crumbs={[{ label: 'Learning' }, { label: 'All Materials' }]}
      />

      <Toolbar className="justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-tight">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials…"
            aria-label="Search materials"
            leading={<Search className="size-3.5" />}
            trailing={
              search ? (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
                  <X className="size-3.5" />
                </button>
              ) : undefined
            }
            className="w-[260px] max-w-full"
          />
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            ariaLabel="Filter by category"
            size="sm"
            options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Select
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as Difficulty | 'all')}
            ariaLabel="Filter by difficulty"
            size="sm"
            options={difficultyOptions}
          />
          <Select
            value={completion}
            onValueChange={(v) => setCompletion(v as Completion)}
            ariaLabel="Filter by your progress"
            size="sm"
            options={completionOptions}
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" icon={<X className="size-3.5" />} onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-tight">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as NonNullable<MaterialFilters['sortBy']>)}
            ariaLabel="Sort materials"
            size="sm"
            options={sortOptions}
          />
          <SegmentedControl<View>
            value={view}
            onChange={setView}
            size="sm"
            ariaLabel="Result layout"
            options={[
              { value: 'grid', label: '', icon: <LayoutGrid className="size-3.5" />, title: 'Grid view' },
              { value: 'list', label: '', icon: <List className="size-3.5" />, title: 'List view' },
            ]}
          />
        </div>
      </Toolbar>

      <p className="text-sm text-fg-tertiary" aria-live="polite">
        {loading ? 'Loading…' : plural(rows.length, 'material')}
      </p>

      {error && <ErrorState onRetry={reload} />}
      {loading && !data && <CardGridSkeleton count={6} />}

      {!loading && rows.length === 0 && !error && (
        <MascotEmptyState
          pose="think"
          title="No materials match those filters"
          description="Try a broader search, or clear the filters to see everything."
          action={
            filtersActive ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      {rows.length > 0 &&
        (view === 'grid' ? (
          <Stagger className="grid grid-cols-1 gap-group sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((m) => (
              <StaggerItem key={m.id} className="h-full">
                <MaterialCard
                  material={m}
                  progress={progressByMaterial.get(m.id)}
                  onToggleFavorite={(id) => void toggleFavorite(id)}
                />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Card className="overflow-hidden p-0">
            {rows.map((m) => (
              <MaterialRow key={m.id} material={m} progress={progressByMaterial.get(m.id)} />
            ))}
          </Card>
        ))}
    </Page>
  )
}
