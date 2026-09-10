import { useState } from 'react'
import { Compass, Monitor, Moon, RotateCcw, Sun } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { resetLocalState } from '@/services/store'
import { isDemoMode } from '@/services'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { useNotificationPrefs } from '@/features/notifications/prefs'
import { formatDate } from '@/lib/format'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/dialog'
import { SegmentedControl } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { useOnboarding } from '@/features/onboarding/useOnboarding'
import { QUESTIONS } from '@/features/onboarding/model'

export function SettingsPage() {
  const { user } = useAuth()
  const { mode, setMode } = useTheme()
  const toast = useToast()

  const { prefs, setAssignments, setResults, setContent } = useNotificationPrefs()
  const onboarding = useOnboarding()
  const [resetOpen, setResetOpen] = useState(false)

  const u = user!

  const doReset = () => {
    resetLocalState()
    setResetOpen(false)
    toast.success('Local data cleared', 'Reloading with the seed data.')
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <Page className="max-w-[820px]">
      <PageHeader title="Settings" description="Your account, appearance, and what this browser remembers." />

      <Card className="p-0">
        <CardHeader title="Account" description="Managed by your training lead." />
        <div className="flex items-center gap-snug p-card">
          <Avatar name={u.name} src={u.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="text-md font-medium text-fg">{u.name}</p>
            <p className="text-base text-fg-secondary">{u.email}</p>
            <div className="mt-tight flex flex-wrap items-center gap-tight">
              <Badge tone={u.role === 'admin' ? 'primary' : 'neutral'}>
                {u.role === 'admin' ? 'Administrator' : 'Sales agent'}
              </Badge>
              <Badge tone="neutral">{u.team}</Badge>
              <span className="text-2xs text-fg-tertiary">{u.jobTitle}</span>
            </div>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-2xs text-fg-tertiary">Joined</p>
            <p className="text-sm text-fg-secondary">{formatDate(u.joinedAt)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <CardHeader title="Appearance" />
        <div className="divide-y divide-[var(--border)]">
          <Setting
            label="Theme"
            description="Auto follows your operating system setting."
            control={
              <SegmentedControl<ThemeMode>
                value={mode}
                onChange={setMode}
                ariaLabel="Colour theme"
                options={[
                  { value: 'light', label: 'Light', icon: <Sun className="size-3.5" /> },
                  { value: 'dark', label: 'Dark', icon: <Moon className="size-3.5" /> },
                  { value: 'system', label: 'Auto', icon: <Monitor className="size-3.5" /> },
                ]}
              />
            }
          />
        </div>
      </Card>

      <Card className="p-0">
        <CardHeader
          title="Notifications"
          description="What reaches the bell menu. Announcements and mentions always come through."
        />
        <div className="divide-y divide-[var(--border)]">
          <Setting
            label="New assignments"
            description="When a lead assigns you a material, path, or assessment."
            control={<Switch checked={prefs.assignments} onCheckedChange={setAssignments} ariaLabel="New assignments" />}
          />
          <Setting
            label="Assessment results"
            description="When a score is recorded against your account."
            control={<Switch checked={prefs.results} onCheckedChange={setResults} ariaLabel="Assessment results" />}
          />
          <Setting
            label="Content updates"
            description="When a material you have started is republished."
            control={<Switch checked={prefs.content} onCheckedChange={setContent} ariaLabel="Content updates" />}
          />
        </div>
      </Card>

      {onboarding.record.completedAt ? <TrainingSetupCard onboarding={onboarding} /> : null}

      {/*
        Demo mode only. With Supabase connected, progress lives in the database
        and this button would clear a browser cache that nothing reads - which
        would look like it had done something. Better to not offer it.
      */}
      {isDemoMode && (
      <Card className="p-0">
        <CardHeader
          title="Local data"
          description="Demo mode stores progress in your browser, not on a server."
        />
        <div className="flex flex-wrap items-center justify-between gap-snug p-card">
          <p className="max-w-[46ch] text-sm text-fg-secondary">
            Clearing resets progress, favourites, assessment attempts, and read receipts back to the seed data. It
            cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            icon={<RotateCcw className="size-3.5" />}
            onClick={() => setResetOpen(true)}
          >
            Clear local data
          </Button>
        </div>
      </Card>
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Clear local data?"
        description="Progress, favourites, attempts, and notifications return to their seeded state. This cannot be undone."
        confirmLabel="Clear and reload"
        destructive
        onConfirm={doReset}
      />
    </Page>
  )
}

function Setting({
  label,
  description,
  control,
}: {
  label: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-snug px-card py-row-y">
      <div className="min-w-0">
        <p className="text-base font-medium text-fg">{label}</p>
        <p className="mt-hair text-sm text-fg-secondary">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

/**
 * First-run setup, revisitable.
 *
 * Shown as plain sentences rather than as a form: the point is to let someone
 * check what the app decided about them and re-run setup if it got it wrong.
 * Re-running is the whole survey again, because four questions is quicker
 * than four separate editors.
 */
function TrainingSetupCard({ onboarding }: { onboarding: ReturnType<typeof useOnboarding> }) {
  const toast = useToast()
  const { answers, record, replayTour, reset } = onboarding

  const labelFor = (key: 'channel' | 'experience' | 'focus') => {
    const question = QUESTIONS.find((q) => q.key === key)
    const choice = question?.choices.find((c) => c.value === answers[key])
    return choice?.label ?? '-'
  }

  return (
    <Card className="p-0">
      <CardHeader
        title="Your training setup"
        description={
          record.skipped
            ? 'You skipped setup, so these are the defaults.'
            : 'What you told us when you first signed in.'
        }
      />

      <dl className="divide-y divide-[var(--border)]">
        <SetupRow term="Where you sell" detail={labelFor('channel')} />
        <SetupRow term="Experience" detail={labelFor('experience')} />
        <SetupRow term="Daily goal" detail={`${answers.dailyMinutes} minutes a day`} />
        <SetupRow term="First focus" detail={labelFor('focus')} />
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-snug border-t border-line p-card">
        <p className="max-w-[46ch] text-sm text-fg-secondary">
          Re-run setup to change your daily goal and starting point, or replay the walkthrough.
        </p>
        <div className="flex flex-wrap items-center gap-tight">
          <Button
            variant="secondary"
            size="sm"
            icon={<Compass className="size-3.5" />}
            onClick={() => {
              replayTour()
              toast.info('Tour restarted', 'Open your dashboard to follow it.')
            }}
          >
            Replay the tour
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="size-3.5" />}
            onClick={() => {
              reset()
              toast.info('Setup will run again', 'Reopen the app to answer the questions.')
            }}
          >
            Re-run setup
          </Button>
        </div>
      </div>
    </Card>
  )
}

function SetupRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-snug px-card py-row-y">
      <dt className="text-base font-medium text-fg">{term}</dt>
      <dd className="text-sm text-fg-secondary">{detail}</dd>
    </div>
  )
}
