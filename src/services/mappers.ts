import type { Tables } from '@/types/database'
import type {
  ActivityLogEntry,
  Assessment,
  AssessmentAttempt,
  AssessmentQuestion,
  Assignment,
  Category,
  ContentBlock,
  Difficulty,
  LearningPath,
  Material,
  MaterialProgress,
  MaterialSection,
  Notification,
  Objection,
  PracticeScenario,
  QuickReferenceCard,
  TrainingActivity,
  User,
  WordingPair,
} from '@/types'

/**
 * Row -> domain mapping.
 *
 * The database uses snake_case and its own vocabulary ("module", "profile");
 * the UI uses camelCase and the words the sidebar uses ("Material", "user").
 * Translating in exactly one place means a column rename is a one-file change
 * and no component ever sees a raw row.
 */

export function rowToUser(r: Tables<'profiles'>): User {
  return {
    id: r.id,
    name: r.display_name?.trim() || r.full_name,
    email: r.email,
    username: r.username,
    role: r.role,
    status: r.status,
    jobTitle: r.position ?? 'Sales Agent',
    team: r.department ?? 'Sales',
    avatarUrl: r.avatar_url ?? undefined,
    joinedAt: r.created_at,
    // Falls back to creation so the admin table never renders "never" for
    // someone who simply has not signed in since the column was added.
    lastActiveAt: r.last_login_at ?? r.created_at,
  }
}

export function rowToCategory(r: Tables<'categories'>): Category {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    accent: r.accent as Category['accent'],
    icon: r.icon,
  }
}

/**
 * A block row's `data` column holds the shape its type requires; the envelope
 * (id/type) is columnar. Reassembling them here keeps the discriminated union
 * in `src/types` as the single description of what a block is.
 */
export function rowToBlock(r: Tables<'content_blocks'>): ContentBlock {
  return { id: r.id, type: r.type, ...(r.data as object) } as ContentBlock
}

/** Splits a block back into (type, data) for storage. */
export function blockToRow(
  block: ContentBlock,
  lessonId: string,
  sortOrder: number,
): Omit<Tables<'content_blocks'>, 'id' | 'created_at' | 'updated_at'> {
  const { id: _id, type, ...data } = block as ContentBlock & { id: string }
  return { lesson_id: lessonId, type, data: data as never, sort_order: sortOrder }
}

export function rowToSection(
  r: Tables<'lessons'>,
  blocks: ContentBlock[],
  index: number,
): MaterialSection {
  return {
    id: r.id,
    // The viewer rail shows a two-digit ordinal; deriving it from position
    // rather than storing it means reordering lessons cannot leave a gap.
    index: String(index + 1).padStart(2, '0'),
    title: r.title,
    summary: r.summary || undefined,
    blocks,
  }
}

export function rowToMaterial(
  r: Tables<'modules'>,
  sections: MaterialSection[] = [],
): Material {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    categoryId: r.category_id ?? '',
    moduleNumber: r.module_number,
    status: r.status,
    difficulty: r.difficulty,
    duration: r.duration_minutes,
    audience: r.audience,
    teams: r.teams,
    tags: r.tags,
    sections,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
    authorId: r.created_by ?? '',
    version: r.version,
    needsClaimReview: r.needs_claim_review || undefined,
  }
}

export function rowToPath(
  r: Tables<'learning_paths'>,
  materialIds: string[],
  estimatedMinutes: number,
): LearningPath {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    audience: r.audience,
    materialIds,
    estimatedMinutes,
    status: r.status,
    accent: r.accent as Category['accent'],
  }
}

export function rowToActivity(r: Tables<'training_activities'>): TrainingActivity {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    objective: r.objective,
    durationMinutes: r.duration_minutes,
    participants: r.participants,
    difficulty: r.difficulty,
    instructions: r.instructions,
    facilitatorNotes: r.facilitator_notes,
    expectedOutcome: r.expected_outcome,
    materials: r.materials.length ? r.materials : undefined,
    tags: r.tags,
    status: r.status,
  }
}

export function rowToScenario(r: Tables<'practice_scenarios'>): PracticeScenario {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    channel: r.channel as PracticeScenario['channel'],
    personality: r.personality as PracticeScenario['personality'],
    difficulty: r.difficulty,
    setup: r.setup,
    goal: r.goal,
    turns: (r.turns as unknown as PracticeScenario['turns']) ?? [],
    coaching: r.coaching,
  }
}

export function rowToObjection(r: Tables<'objections'>): Objection {
  return {
    id: r.id,
    slug: r.slug,
    objection: r.objection,
    translation: r.translation,
    category: r.category as Objection['category'],
    frequency: r.frequency as Objection['frequency'],
    acknowledge: r.acknowledge,
    clarify: r.clarify,
    address: r.address,
    close: r.close,
    pitfalls: r.pitfalls,
    claimSensitive: r.claim_sensitive,
  }
}

export function rowToWording(r: Tables<'wording_pairs'>): WordingPair {
  return {
    id: r.id,
    avoid: r.avoid,
    use: r.use,
    context: r.context as WordingPair['context'],
    note: r.note || undefined,
    tags: r.tags,
  }
}

export function rowToQuickReference(r: Tables<'quick_reference_items'>): QuickReferenceCard {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    kicker: r.kicker,
    kind: r.kind as QuickReferenceCard['kind'],
    channel: r.channel as QuickReferenceCard['channel'],
    blocks: (r.blocks as unknown as ContentBlock[]) ?? [],
  }
}

export function rowToAssessment(
  r: Tables<'assessments'>,
  questions: AssessmentQuestion[] = [],
): Assessment {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    materialId: r.module_id ?? undefined,
    passingScore: r.passing_score,
    timeLimitMinutes: r.time_limit_minutes ?? undefined,
    questions,
    status: r.status,
    attemptsAllowed: r.attempts_allowed,
  }
}

export function rowToAttempt(r: Tables<'assessment_attempts'>): AssessmentAttempt {
  return {
    id: r.id,
    userId: r.user_id,
    assessmentId: r.assessment_id,
    // A percentage, not a raw point count - it is what the results screen and
    // every report compare against the passing score.
    score: Number(r.percentage ?? 0),
    points: { earned: r.score ?? 0, total: r.max_score ?? 0 },
    attemptNumber: r.attempt_number,
    passed: r.passed ?? false,
    startedAt: r.started_at,
    submittedAt: r.submitted_at ?? r.started_at,
  }
}

export function rowToProgress(
  r: Tables<'module_progress'>,
  completedLessonIds: string[],
  favorite: boolean,
): MaterialProgress {
  return {
    userId: r.user_id,
    materialId: r.module_id,
    state: r.state,
    completedSectionIds: completedLessonIds,
    lastViewedSectionId: r.last_viewed_lesson_id ?? undefined,
    startedAt: r.started_at ?? undefined,
    completedAt: r.completed_at ?? undefined,
    lastViewedAt: r.last_viewed_at ?? undefined,
    favorite,
  }
}

/** DB target_type -> the domain's narrower union. */
export function dbTargetToDomain(
  t: Tables<'assignments'>['target_type'],
): Assignment['targetType'] {
  if (t === 'path') return 'path'
  if (t === 'assessment') return 'assessment'
  // 'module' and 'activity' are both opened as material in the UI.
  return 'material'
}

/** Domain -> DB. A material is stored as a module. */
export function domainTargetToDb(
  t: Assignment['targetType'],
): Tables<'assignments'>['target_type'] {
  return t === 'material' ? 'module' : t
}

export function rowToAssignment(r: Tables<'assignments'>): Assignment {
  const overdue =
    r.status !== 'completed' && r.due_at !== null && new Date(r.due_at) < new Date()

  return {
    id: r.id,
    userId: r.user_id,
    // The database also allows 'activity' and calls a material a 'module'.
    // Both fold onto the domain's three-way union; see targetTypeToDb().
    targetType: dbTargetToDomain(r.target_type),
    targetId: r.target_id,
    assignedBy: r.assigned_by ?? '',
    assignedAt: r.assigned_at,
    dueAt: r.due_at ?? '',
    // Overdue is derived, matching assignment_effective_status() in SQL, so a
    // deadline passing needs no write and no scheduled job.
    status: overdue ? 'overdue' : r.status,
    note: r.note || undefined,
  }
}

export function rowToNotification(r: Tables<'notifications'>): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind === 'due' ? 'assignment' : r.kind,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    read: r.read,
    href: r.href ?? undefined,
  }
}

export function rowToLogEntry(r: Tables<'activity_logs'>): ActivityLogEntry {
  return {
    id: r.id,
    actorId: r.actor_id ?? '',
    action: r.action as ActivityLogEntry['action'],
    targetLabel: r.target_label,
    targetId: r.entity_id ?? undefined,
    at: r.created_at,
    meta: (r.meta as ActivityLogEntry['meta']) ?? undefined,
  }
}

export const DIFFICULTIES: Difficulty[] = ['foundation', 'intermediate', 'advanced']
