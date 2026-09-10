import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PermissionGuard, ProtectedRoute, RoleGuard } from '@/features/auth/guards'
import { PermissionProvider } from '@/features/auth/PermissionProvider'
import { OnboardingGate } from '@/features/onboarding/OnboardingGate'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/layouts/AppShell'

import { LoginPage } from '@/pages/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProgressPage } from '@/pages/ProgressPage'
import { SettingsPage } from '@/pages/SettingsPage'

import { MaterialsPage } from '@/pages/learning/MaterialsPage'
import { MaterialDetailPage } from '@/pages/learning/MaterialDetailPage'
import { PathsPage } from '@/pages/learning/PathsPage'
import { PathDetailPage } from '@/pages/learning/PathDetailPage'
import { CategoriesPage } from '@/pages/learning/CategoriesPage'
import { QuickReferencePage } from '@/pages/learning/QuickReferencePage'

import { ActivitiesPage } from '@/pages/training/ActivitiesPage'
import { ActivityDetailPage } from '@/pages/training/ActivityDetailPage'
import { AssessmentsPage } from '@/pages/training/AssessmentsPage'
import { PracticePage } from '@/pages/training/PracticePage'

import { PhoneScriptsPage } from '@/pages/resources/PhoneScriptsPage'
import { ChatScriptsPage } from '@/pages/resources/ChatScriptsPage'
import { ObjectionsPage } from '@/pages/resources/ObjectionsPage'
import { ClosingPage } from '@/pages/resources/ClosingPage'
import { SalesBiblePage } from '@/pages/resources/SalesBiblePage'
import { NotificationsPage } from '@/pages/NotificationsPage'


/* Split out of the initial bundle: the admin console and the two runners are
   large and are never the learner's first paint. */
const AccessPage = lazy(() => import('@/pages/admin/AccessPage').then((m) => ({ default: m.AccessPage })))
const AssignmentsPage = lazy(() => import('@/pages/admin/AssignmentsPage').then((m) => ({ default: m.AssignmentsPage })))
const ContentPage = lazy(() => import('@/pages/admin/ContentPage').then((m) => ({ default: m.ContentPage })))
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })))
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const LogsPage = lazy(() => import('@/pages/admin/LogsPage').then((m) => ({ default: m.LogsPage })))
const AssessmentsAdminPage = lazy(() => import('@/pages/admin/AssessmentsAdminPage').then((m) => ({ default: m.AssessmentsAdminPage })))
const AssessmentBuilderPage = lazy(() => import('@/pages/admin/AssessmentBuilderPage').then((m) => ({ default: m.AssessmentBuilderPage })))
const TrainingAdminPage = lazy(() => import('@/pages/admin/TrainingAdminPage').then((m) => ({ default: m.TrainingAdminPage })))
const AnnouncementsAdminPage = lazy(() => import('@/pages/admin/AnnouncementsAdminPage').then((m) => ({ default: m.AnnouncementsAdminPage })))
const AssessmentRunnerPage = lazy(() => import('@/pages/training/AssessmentRunnerPage').then((m) => ({ default: m.AssessmentRunnerPage })))
const PracticeRunnerPage = lazy(() => import('@/pages/training/PracticeRunnerPage').then((m) => ({ default: m.PracticeRunnerPage })))

/**
 * Route table. Every admin path sits behind `RoleGuard` as well as being hidden
 * from the sidebar - hiding navigation is presentation, not protection (§23).
 */
export function App() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <AuthProvider>
          <PermissionProvider>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Supabase redirects here after Google OAuth and after an
                emailed confirmation or recovery link (§55). */}
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />

            <Route element={<ProtectedRoute />}>
              {/* First-run setup replaces the shell; the tour rides alongside it. */}
              <Route element={<OnboardingGate />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />

                <Route path="learning/materials" element={<MaterialsPage />} />
                <Route path="learning/materials/:slug" element={<MaterialDetailPage />} />
                <Route path="learning/paths" element={<PathsPage />} />
                <Route path="learning/paths/:slug" element={<PathDetailPage />} />
                <Route path="learning/categories" element={<CategoriesPage />} />
                <Route path="learning/quick-reference" element={<QuickReferencePage />} />

                <Route path="training/activities" element={<ActivitiesPage />} />
                <Route path="training/activities/:slug" element={<ActivityDetailPage />} />
                <Route path="training/assessments" element={<AssessmentsPage />} />
                <Route path="training/assessments/:slug" element={<AssessmentRunnerPage />} />
                <Route path="training/practice" element={<PracticePage />} />
                <Route path="training/practice/:slug" element={<PracticeRunnerPage />} />

                <Route path="resources/phone-scripts" element={<PhoneScriptsPage />} />
                <Route path="resources/chat-scripts" element={<ChatScriptsPage />} />
                <Route path="resources/objections" element={<ObjectionsPage />} />
                <Route path="resources/closing" element={<ClosingPage />} />
                <Route path="resources/sales-bible" element={<SalesBiblePage />} />

                <Route path="notifications" element={<NotificationsPage />} />

                <Route path="progress" element={<ProgressPage />} />
                <Route path="settings" element={<SettingsPage />} />

                {/*
                  Two layers, and they do different jobs.

                  RoleGuard keeps the whole console behind the admin role, so a
                  sales user never lands on an admin URL. PermissionGuard then
                  gates each screen on the specific permission it needs, which
                  is what lets a Trainer reach content and assessments while a
                  Content Editor reaches content but not the reports.

                  Neither is the security boundary. The RLS policies in
                  supabase/migrations/...rbac_and_invitations.sql are, and they
                  are tested without any client involved.
                */}
                <Route element={<RoleGuard allow={['admin']} />}>
                  <Route element={<PermissionGuard allow={['users.view']} />}>
                    <Route path="admin/users" element={<AccessPage />} />
                  </Route>

                  <Route element={<PermissionGuard allow={['assignments.manage']} />}>
                    <Route path="admin/assignments" element={<AssignmentsPage />} />
                  </Route>

                  <Route
                    element={
                      <PermissionGuard
                        allow={['content.view_drafts', 'content.create', 'content.edit']}
                      />
                    }
                  >
                    <Route path="admin/content" element={<ContentPage />} />
                  </Route>

                  <Route element={<PermissionGuard allow={['categories.manage']} />}>
                    <Route path="admin/categories" element={<AdminCategoriesPage />} />
                  </Route>

                  <Route element={<PermissionGuard allow={['reports.view']} />}>
                    <Route path="admin/reports" element={<ReportsPage />} />
                  </Route>

                  <Route element={<PermissionGuard allow={['logs.view']} />}>
                    <Route path="admin/logs" element={<LogsPage />} />
                  </Route>

                  <Route
                    element={
                      <PermissionGuard allow={['assessments.create', 'assessments.edit']} />
                    }
                  >
                    <Route path="admin/assessments" element={<AssessmentsAdminPage />} />
                    <Route path="admin/assessments/:id" element={<AssessmentBuilderPage />} />
                  </Route>

                  <Route element={<PermissionGuard allow={['training.manage']} />}>
                    <Route path="admin/training" element={<TrainingAdminPage />} />
                  </Route>

                  <Route element={<PermissionGuard allow={['announcements.manage']} />}>
                    <Route path="admin/announcements" element={<AnnouncementsAdminPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
              </Route>
            </Route>
          </Routes>
          </Suspense>
          </PermissionProvider>
        </AuthProvider>
      </ToastProvider>
    </TooltipProvider>
  )
}

/** Shown while a lazily-loaded route chunk arrives. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <span className="text-sm text-fg-tertiary">Loading...</span>
    </div>
  )
}
