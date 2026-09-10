/**
 * The service layer (§50, §52).
 *
 * Components import from here and never touch `@/lib/supabase` directly, so
 * query shapes, row mapping and error handling stay in one place. Each service
 * resolves to a Supabase implementation or the offline demo store depending on
 * configuration; see `./backend.ts`.
 */
export { authService, isDemoMode } from './authService'
export { usingSupabase } from './backend'

export { userService } from './userService'
export { materialService } from './materialService'
export { progressService } from './progressService'
export { assessmentService } from './assessmentService'
export { trainingService } from './trainingService'
export { notificationService } from './notificationService'
export { assignmentService } from './assignmentService'
export { reportService } from './reportService'
export { resourceService } from './resourceService'
export { assessmentAdminService } from './assessmentAdminService'
export { rbacService } from './rbacService'

export type { MaterialFilters } from './materialService'
export type { UserFilters } from './userService'
export type { LearnerSummary } from './progressService'
export type { AssignmentRow } from './assignmentService'
export type {
  AdminOverview,
  AtRiskLearner,
  MaterialUsage,
  SeriesPoint,
  TeamCompletion,
} from './reportService'

export {
  gamificationService,
  levelFromXp,
  totalXp,
  xpForMaterial,
  buildUnits,
} from './gamificationService'
