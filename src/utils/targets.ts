import type { Assignment } from '@/types'
import { materials } from '@/data/materials'
import { learningPaths } from '@/data/paths'
import { assessments } from '@/data/assessments'

export interface ResolvedTarget {
  label: string
  to: string
  kind: string
}

/** Turns an assignment's `{targetType, targetId}` into something linkable. */
export function resolveTarget(targetType: Assignment['targetType'], targetId: string): ResolvedTarget {
  switch (targetType) {
    case 'material': {
      const m = materials.find((x) => x.id === targetId)
      return { label: m?.title ?? 'Removed material', to: m ? `/learning/materials/${m.slug}` : '#', kind: 'Material' }
    }
    case 'path': {
      const p = learningPaths.find((x) => x.id === targetId)
      return { label: p?.title ?? 'Removed path', to: p ? `/learning/paths/${p.slug}` : '#', kind: 'Path' }
    }
    case 'assessment': {
      const a = assessments.find((x) => x.id === targetId)
      return { label: a?.title ?? 'Removed assessment', to: a ? `/training/assessments/${a.slug}` : '#', kind: 'Assessment' }
    }
  }
}
