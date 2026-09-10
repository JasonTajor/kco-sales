/* ---------------------------------------------------------------------------
   Domain types. These are the contract between the UI and the service layer;
   swapping the mock services for Supabase should not change this file.
--------------------------------------------------------------------------- */

export type Role = 'admin' | 'sales'

export type UserStatus = 'active' | 'inactive' | 'pending'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  jobTitle: string
  team: Team
  avatarUrl?: string
  joinedAt: string
  lastActiveAt: string
}

/**
 * Teams are stored as free text in `profiles.department`, so this is a string
 * rather than a closed union - a new team should not need a code change. The
 * union half keeps editor autocomplete for the values already in use; the
 * `string & {}` half is what stops TypeScript from collapsing it to `string`
 * and losing those suggestions.
 */
export const TEAMS = ['Phone Sales', 'Chat Support', 'Field Sales', 'Training', 'Operations'] as const

export type Team = (typeof TEAMS)[number] | (string & {})

/* -------------------------------------------------------------- content ---- */

export type ContentStatus = 'draft' | 'published' | 'archived'
export type Difficulty = 'foundation' | 'intermediate' | 'advanced'

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  /** Token name, resolved to a colour by `categoryAccent()`. */
  accent: 'green' | 'blue' | 'amber' | 'violet' | 'rose' | 'slate'
  icon: string
}

/** A discriminated union of everything the block editor can render or edit. */
export type ContentBlock =
  | { id: string; type: 'heading'; level: 2 | 3; text: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'bullets'; items: string[] }
  | { id: string; type: 'numbered'; items: string[] }
  | { id: string; type: 'checklist'; items: { text: string; hint?: string }[] }
  | {
      id: string
      type: 'callout'
      variant: 'info' | 'warning' | 'success' | 'danger'
      title?: string
      text: string
    }
  | { id: string; type: 'dosdonts'; dos: string[]; donts: string[] }
  | { id: string; type: 'script'; label?: string; language: 'en' | 'fil' | 'mixed'; lines: string[] }
  | {
      id: string
      type: 'comparison'
      caption?: string
      columns: [string, string]
      rows: [string, string][]
    }
  | { id: string; type: 'formula'; name: string; steps: { key: string; label: string; detail: string }[] }
  | {
      id: string
      type: 'scenario'
      customer: string
      situation: string
      response: string
      why: string
    }
  | { id: string; type: 'quote'; text: string; attribution?: string }
  | {
      id: string
      type: 'quiz'
      question: string
      options: string[]
      answerIndex: number
      explanation: string
    }
  | { id: string; type: 'activity'; activityId: string }
  | { id: string; type: 'wording'; pairs: { avoid: string; use: string; note?: string }[] }

export const BLOCK_TYPES = [
  'heading',
  'text',
  'bullets',
  'numbered',
  'checklist',
  'callout',
  'dosdonts',
  'script',
  'comparison',
  'formula',
  'scenario',
  'quote',
  'quiz',
  'wording',
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

export interface MaterialSection {
  id: string
  /** Two-digit ordinal shown in the viewer rail, e.g. "01". */
  index: string
  title: string
  summary?: string
  blocks: ContentBlock[]
}

export interface Material {
  id: string
  slug: string
  title: string
  description: string
  categoryId: string
  moduleNumber: number
  status: ContentStatus
  difficulty: Difficulty
  /** Minutes. */
  duration: number
  audience: Role[]
  teams: Team[]
  tags: string[]
  sections: MaterialSection[]
  updatedAt: string
  createdAt: string
  authorId: string
  version: number
  /** Set when a block makes an unverified business/earnings claim (§25 guardrail). */
  needsClaimReview?: boolean
}

export interface LearningPath {
  id: string
  slug: string
  title: string
  description: string
  audience: Role[]
  materialIds: string[]
  estimatedMinutes: number
  status: ContentStatus
  accent: Category['accent']
}

/* ------------------------------------------------------------- training ---- */

export interface TrainingActivity {
  id: string
  slug: string
  title: string
  objective: string
  durationMinutes: number
  participants: string
  difficulty: Difficulty
  instructions: string[]
  facilitatorNotes: string[]
  expectedOutcome: string
  materials?: string[]
  tags: string[]
  status: ContentStatus
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_select' | 'short_answer'

export interface AssessmentQuestion {
  id: string
  prompt: string
  type: QuestionType
  options: string[]
  /**
   * Index of the correct option.
   *
   * -1 when the backend is Supabase: the answer key is withheld from a
   * learner's client at the column level, so the runner genuinely does not
   * know it and scoring happens server-side. Only the demo backend, which has
   * no security boundary to enforce, fills this in.
   */
  answerIndex: number
  /**
   * Database ids of the options, in display order. Present only on the
   * Supabase backend, where answers are recorded by choice id rather than by
   * position - so reordering options later cannot silently re-score a past
   * attempt.
   */
  choiceIds?: string[]
  explanation: string
  points: number
}

/** One question's answer, as the runner submits it. */
export interface AnswerInput {
  questionId: string
  /** Selected option ids. Empty for a short answer. */
  choiceIds: string[]
  /** Free text, for short-answer questions. */
  text?: string
}

/** An attempt in progress, before it has a score. */
export interface AttemptDraft {
  id: string
  attemptNumber: number
  startedAt: string
}

/** One question as it appears on the results screen, after submission. */
export interface AttemptReviewRow {
  questionId: string
  prompt: string
  type: QuestionType
  points: number
  explanation: string
  options: { id: string; text: string }[]
  selectedChoiceIds: string[]
  /** Empty when the assessment is configured not to reveal the key. */
  correctChoiceIds: string[]
  textAnswer?: string
  correctText?: string
  isCorrect: boolean | null
  pointsAwarded: number
}

export interface Assessment {
  id: string
  slug: string
  title: string
  description: string
  materialId?: string
  passingScore: number
  timeLimitMinutes?: number
  questions: AssessmentQuestion[]
  status: ContentStatus
  attemptsAllowed: number
}

export type CustomerPersonality =
  | 'angry'
  | 'sleepy'
  | 'confused'
  | 'cheap'
  | 'funny'
  | 'seen-zone'
  | 'curious'
  | 'busy'
  | 'send-details'

export interface PracticeScenario {
  id: string
  slug: string
  title: string
  channel: 'phone' | 'chat' | 'objection'
  personality: CustomerPersonality
  difficulty: Difficulty
  setup: string
  goal: string
  /** Mock turns. A future backend/AI service replaces this array wholesale. */
  turns: PracticeTurn[]
  coaching: string[]
}

export interface PracticeTurn {
  id: string
  customer: string
  /** Ordered best → worst; index 0 is the model answer. */
  choices: { text: string; verdict: 'best' | 'ok' | 'poor'; feedback: string }[]
}

/* ---------------------------------------------------------- objections ---- */

export interface Objection {
  id: string
  slug: string
  objection: string
  translation: string
  category: 'price' | 'risk' | 'capability' | 'competition' | 'capital' | 'timing' | 'market'
  frequency: 'very-high' | 'high' | 'medium' | 'low'
  acknowledge: string
  clarify: string
  address: string
  close: string
  pitfalls: string[]
  /** True when the addressed answer touches earnings/ROI and must stay illustrative. */
  claimSensitive: boolean
}

export interface WordingPair {
  id: string
  avoid: string
  use: string
  context: 'phone' | 'chat' | 'both'
  note?: string
  tags: string[]
}

export interface QuickReferenceCard {
  id: string
  slug: string
  title: string
  kicker: string
  kind: 'script' | 'formula' | 'checklist' | 'rule'
  channel: 'phone' | 'chat' | 'both'
  blocks: ContentBlock[]
}

/* ------------------------------------------------------------- progress ---- */

export type ProgressState = 'not-started' | 'in-progress' | 'completed'

export interface MaterialProgress {
  userId: string
  materialId: string
  state: ProgressState
  completedSectionIds: string[]
  lastViewedSectionId?: string
  startedAt?: string
  completedAt?: string
  lastViewedAt?: string
  favorite: boolean
}

export interface AssessmentAttempt {
  id: string
  userId: string
  assessmentId: string
  /** Percentage, 0-100. What the passing score is compared against. */
  score: number
  /** Raw points earned and available, when the backend reports them. */
  points?: { earned: number; total: number }
  attemptNumber: number
  passed: boolean
  startedAt: string
  submittedAt: string
}

export type AssignmentStatus = 'not-started' | 'in-progress' | 'completed' | 'overdue'

export interface Assignment {
  id: string
  userId: string
  targetType: 'material' | 'path' | 'assessment'
  targetId: string
  assignedBy: string
  assignedAt: string
  dueAt: string
  status: AssignmentStatus
  note?: string
}

/* --------------------------------------------------------------- system ---- */

export interface Notification {
  id: string
  userId: string
  kind: 'assignment' | 'announcement' | 'result' | 'content' | 'mention'
  title: string
  body: string
  createdAt: string
  read: boolean
  href?: string
}

export type ActivityAction =
  | 'material.viewed'
  | 'material.completed'
  | 'material.published'
  | 'material.archived'
  | 'material.created'
  | 'material.updated'
  | 'assessment.submitted'
  | 'assessment.created'
  | 'assessment.updated'
  | 'assessment.published'
  | 'assessment.archived'
  | 'assignment.created'
  | 'user.invited'
  | 'user.deactivated'
  | 'user.login'
  | 'activity.ran'
  | 'activity.created'
  | 'activity.updated'
  | 'activity.archived'
  | 'user.invited'
  | 'user.invite_revoked'
  | 'user.role_changed'
  | 'user.status_changed'
  | 'user.permission_changed'
  | 'script.created'
  | 'script.updated'
  | 'objection.created'
  | 'objection.updated'
  | 'announcement.created'
  | 'announcement.updated'
  | 'sales_bible.updated'
  | 'settings.updated'

export interface ActivityLogEntry {
  id: string
  actorId: string
  action: ActivityAction
  targetLabel: string
  targetId?: string
  at: string
  ip?: string
  meta?: Record<string, string | number>
}

/* --------------------------------------------------------------- shared ---- */

export interface Paginated<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface QueryOptions {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

/* ---------------------------------------------------------- gamification ---- */

/**
 * Every value below is DERIVED from existing progress records, never stored.
 * That keeps the reward layer honest: XP cannot drift out of sync with the
 * work the learner actually did, and a future backend can recompute it.
 */

export interface XpEvent {
  id: string
  /** What earned it, in the learner's language. */
  label: string
  amount: number
  at: string
  kind: 'section' | 'material' | 'assessment' | 'scenario' | 'streak'
}

export interface LevelInfo {
  level: number
  title: string
  xpIntoLevel: number
  xpForNextLevel: number
  totalXp: number
  /** 0-100, progress through the current level. */
  percent: number
}

export interface StreakInfo {
  current: number
  longest: number
  /** True when the learner has already done something today. */
  activeToday: boolean
  /** Last seven days, oldest first. */
  week: { day: string; active: boolean }[]
}

export interface DailyGoal {
  targetMinutes: number
  earnedMinutes: number
  percent: number
  met: boolean
}

export type AchievementId =
  | 'first-lesson'
  | 'first-module'
  | 'streak-3'
  | 'streak-7'
  | 'objection-master'
  | 'perfect-score'
  | 'phone-certified'
  | 'chat-certified'
  | 'practice-regular'
  | 'library-half'

export interface Achievement {
  id: AchievementId
  title: string
  description: string
  /** A name in the animated emoji palette (`src/data/emoji.ts`). */
  icon: string
  /** Undefined while locked. */
  unlockedAt?: string
  /** Progress toward unlocking, 0-100. */
  percent: number
  hint: string
}

/** A node in the learning path: the unit of progression the learner sees. */
export interface PathNode {
  id: string
  materialId: string
  slug: string
  title: string
  kind: 'lesson' | 'quiz' | 'challenge'
  state: 'completed' | 'current' | 'available' | 'locked'
  xp: number
  durationMinutes: number
  sectionsDone: number
  sectionsTotal: number
}

export interface PathUnit {
  id: string
  index: number
  title: string
  summary: string
  nodes: PathNode[]
  state: 'completed' | 'current' | 'locked'
}

export interface LearnerJourney {
  level: LevelInfo
  streak: StreakInfo
  goal: DailyGoal
  achievements: Achievement[]
  recentXp: XpEvent[]
  /** The single most important thing to do next. */
  nextUp?: PathNode
}
