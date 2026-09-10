import type {
  ActivityLogEntry,
  Assessment,
  AssessmentAttempt,
  Assignment,
  Category,
  LearningPath,
  Material,
  MaterialProgress,
  Notification,
  PracticeScenario,
  TrainingActivity,
  User,
} from '@/types'
import { categories as seedCategories } from '@/data/categories'
import { materials as seedMaterials } from '@/data/materials'
import { learningPaths as seedPaths } from '@/data/paths'
import { assessments as seedAssessments } from '@/data/assessments'
import { trainingActivities as seedActivities } from '@/data/activities'
import { practiceScenarios as seedScenarios } from '@/data/scenarios'
import { users as seedUsers } from '@/mock/users'
import { seedAssignments, seedAttempts, seedProgress } from '@/mock/progress'
import { seedNotifications } from '@/mock/notifications'
import { seedActivityLog } from '@/mock/activityLog'

/**
 * In-memory store standing in for the database.
 *
 * Everything the services touch lives here. Progress, favourites, and read
 * receipts are persisted to localStorage so a reload feels like a real account;
 * content and users reset from the seeds, which is what you want in a demo.
 */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

const LS_PREFIX = 'kco.'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function persist(key: string, value: unknown): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage unavailable - the session simply becomes non-persistent */
  }
}

export interface Store {
  users: User[]
  categories: Category[]
  materials: Material[]
  paths: LearningPath[]
  assessments: Assessment[]
  activities: TrainingActivity[]
  scenarios: PracticeScenario[]
  progress: MaterialProgress[]
  attempts: AssessmentAttempt[]
  assignments: Assignment[]
  notifications: Notification[]
  activityLog: ActivityLogEntry[]
}

export const db: Store = {
  // Authored content and people are editable in the admin area, so they persist
  // too - a material you create survives a reload, which is the whole point of
  // reviewing the frontend before a backend exists.
  users: load('users', clone(seedUsers)),
  categories: load('categories', clone(seedCategories)),
  materials: load('materials', clone(seedMaterials)),
  assignments: load('assignments', clone(seedAssignments)),
  progress: load('progress', clone(seedProgress)),
  attempts: load('attempts', clone(seedAttempts)),
  notifications: load('notifications', clone(seedNotifications)),
  activityLog: load('activityLog', clone(seedActivityLog)),

  // Read-only in this build.
  paths: clone(seedPaths),
  assessments: clone(seedAssessments),
  activities: clone(seedActivities),
  scenarios: clone(seedScenarios),
}

export const persistProgress = () => persist('progress', db.progress)
export const persistAttempts = () => persist('attempts', db.attempts)
export const persistNotifications = () => persist('notifications', db.notifications)
export const persistMaterials = () => persist('materials', db.materials)
export const persistUsers = () => persist('users', db.users)
export const persistCategories = () => persist('categories', db.categories)
export const persistAssignments = () => persist('assignments', db.assignments)
export const persistActivityLog = () => persist('activityLog', db.activityLog.slice(0, 400))

const PERSISTED_KEYS = [
  'progress',
  'attempts',
  'notifications',
  'materials',
  'users',
  'categories',
  'assignments',
  'activityLog',
] as const

/** Wipes every locally persisted change and restores the seeded baseline. */
export function resetLocalState(): void {
  try {
    PERSISTED_KEYS.forEach((k) => localStorage.removeItem(LS_PREFIX + k))
  } catch {
    /* ignore */
  }
  db.progress = clone(seedProgress)
  db.attempts = clone(seedAttempts)
  db.notifications = clone(seedNotifications)
  db.materials = clone(seedMaterials)
  db.users = clone(seedUsers)
  db.categories = clone(seedCategories)
  db.assignments = clone(seedAssignments)
  db.activityLog = clone(seedActivityLog)
}

/** Records an audit entry. Real implementation would be a server-side insert. */
export function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'at'>): void {
  db.activityLog.unshift({
    ...entry,
    id: `log-live-${Date.now().toString(36)}-${db.activityLog.length + 1}`,
    at: new Date().toISOString(),
  })
  persistActivityLog()
}
