import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertCircle, ArrowRight, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/common/Logo'
import { FullPageSpinner } from '@/components/common/FullPageSpinner'
import { useToast } from '@/components/ui/toast'
import { GoogleMark } from '@/components/common/GoogleMark'
import { DEMO_ADMIN_EMAIL, DEMO_SALES_EMAIL } from '@/mock/users'
import { rbacService } from '@/services'
import { cn } from '@/lib/cn'

interface FromState {
  from?: string
}

type Panel = 'signin' | 'forgot' | 'setup'

/**
 * Sign-in (§54).
 *
 * Two columns on a wide screen: the form on the left at a fixed, comfortable
 * measure, and a quiet brand panel on the right that carries the product's
 * name and nothing that needs reading. On a phone the panel drops away
 * entirely rather than becoming a banner to scroll past.
 */
export function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [panel, setPanel] = useState<Panel>('signin')

  if (loading) return <FullPageSpinner label="Restoring your session" />
  if (user) return <Navigate to={(location.state as FromState | null)?.from ?? '/'} replace />

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex items-center justify-center px-gutter py-12">
        <div className="w-full max-w-[380px]">
          <Logo />

          {panel === 'signin' && (
            <SignInPanel
              onForgot={() => setPanel('forgot')}
              onSetup={() => setPanel('setup')}
            />
          )}
          {panel === 'forgot' && <ForgotPanel onBack={() => setPanel('signin')} />}
          {panel === 'setup' && <SetupPanel onBack={() => setPanel('signin')} />}
        </div>
      </div>

      <BrandPanel />
    </div>
  )
}

/* -------------------------------------------------------------- sign in ---- */

function SignInPanel({
  onForgot,
  onSetup,
}: {
  onForgot: () => void
  onSetup: () => void
}) {
  const { signIn, signInWithGoogle, isDemoMode } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'password' | 'google' | null>(null)
  /** Marks the fields red; the message itself is announced by the toast. */
  const [invalid, setInvalid] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInvalid(false)

    if (!email.trim() || !password) {
      setInvalid(true)
      toast.error('Missing email or password', 'Fill both fields to sign in.')
      return
    }

    setBusy('password')
    try {
      await signIn(email, password)
      // On success the provider swaps the route out from under this component,
      // so there is deliberately no setBusy(null) on the happy path.
    } catch (err) {
      setInvalid(true)
      toast.error("That sign-in did not work", err instanceof Error ? err.message : 'Check your email and password, then try again.')
      setBusy(null)
    }
  }

  const google = async () => {
    setBusy('google')
    try {
      await signInWithGoogle()
    } catch (err) {
      toast.error('Google sign-in failed', err instanceof Error ? err.message : 'Try again, or use your email and password.')
      setBusy(null)
    }
  }

  return (
    <>
      <h1 className="mt-rhythm text-2xl font-bold tracking-tight text-fg">Sign in</h1>
      <p className="mt-hair text-base text-fg-secondary">
        Use your KCO work account to reach the training platform.
      </p>

      <form onSubmit={submit} className="mt-group space-y-group" noValidate>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@kco.ph"
            invalid={invalid}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          action={
            <button
              type="button"
              onClick={onForgot}
              className="text-xs font-medium text-fg-secondary underline-offset-2 hover:text-fg hover:underline"
            >
              Forgot password?
            </button>
          }
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            invalid={invalid}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" className="w-full" disabled={busy !== null}>
          {busy === 'password' ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      </form>

      <div className="my-group flex items-center gap-tight" role="presentation">
        <span className="h-px flex-1 bg-line" />
        <span className="text-2xs font-medium uppercase tracking-wider text-fg-tertiary">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button variant="secondary" className="w-full" onClick={google} disabled={busy !== null}>
        {busy === 'google' ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <>
            <GoogleMark className="size-4" />
            Continue with Google
          </>
        )}
      </Button>

      {/*
        Account creation is closed: an admin creates the account, the person
        sets the password. This is stated rather than hidden, because somebody
        who was told "an account has been made for you" needs to know that
        their first step is here and not a sign-up form.
      */}
      <p className="mt-group text-center text-xs text-fg-secondary">
        First time here?{' '}
        <button
          type="button"
          onClick={onSetup}
          className="font-bold text-fg underline-offset-2 hover:underline"
        >
          Set up my account
        </button>
      </p>

      {isDemoMode ? <DemoNotice /> : null}
    </>
  )
}

/* --------------------------------------------------------------- forgot ---- */

function ForgotPanel({ onBack }: { onBack: () => void }) {
  const { requestPasswordReset } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [invalid, setInvalid] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInvalid(false)

    if (!email.trim()) {
      setInvalid(true)
      toast.error('Missing email', 'Enter the address on your KCO account.')
      return
    }

    setBusy(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setInvalid(true)
      toast.error('Could not send the reset email', err instanceof Error ? err.message : 'Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <>
        <div className="mt-rhythm flex size-9 items-center justify-center rounded-full bg-success-subtle">
          <Check className="size-4.5 text-success-fg" aria-hidden />
        </div>
        <h1 className="mt-group text-2xl font-bold tracking-tight text-fg">Check your inbox</h1>
        <p className="mt-hair text-base text-fg-secondary">
          If an account exists for <span className="font-medium text-fg">{email}</span>, a reset
          link is on its way. The link expires in one hour.
        </p>
        <Button variant="secondary" className="mt-group w-full" onClick={onBack}>
          Back to sign in
        </Button>
      </>
    )
  }

  return (
    <>
      <h1 className="mt-rhythm text-2xl font-bold tracking-tight text-fg">Reset your password</h1>
      <p className="mt-hair text-base text-fg-secondary">
        We will email you a link to choose a new one.
      </p>

      <form onSubmit={submit} className="mt-group space-y-group" noValidate>
        <Field label="Email" htmlFor="reset-email">
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@kco.ph"
            invalid={invalid}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Send reset link'}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
      </form>
    </>
  )
}

/* ---------------------------------------------------------------- setup --- */

const MIN_PASSWORD = 8

/**
 * First sign-in for an invited person.
 *
 * There is no public sign-up. The database refuses any account with no
 * matching invitation, so this form is not a registration form - it is the
 * step where somebody an admin has already approved chooses their password.
 *
 * The invitation is checked before the password is asked for, so a mistyped
 * address is caught immediately rather than after filling the whole form.
 */
function SetupPanel({ onBack }: { onBack: () => void }) {
  const { signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [checking, setChecking] = useState(false)
  const [invited, setInvited] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const check = async () => {
    const address = email.trim()
    if (!address) return
    setChecking(true)
    setError(null)
    try {
      setInvited(await rbacService.invitationExists(address))
    } catch {
      // If the check itself fails, let them try the signup - the database is
      // the authority and will refuse it properly.
      setInvited(true)
    } finally {
      setChecking(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD) {
      return setError(`Choose a password of at least ${MIN_PASSWORD} characters.`)
    }
    if (password !== confirm) return setError('The two passwords do not match.')

    setBusy(true)
    try {
      const { needsVerification } = await signUp(email.trim(), password, '')
      setDone(true)
      if (!needsVerification) {
        // A session already exists; the provider will redirect.
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not set up the account. Ask your administrator to check the invitation.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <>
        <div className="mt-rhythm flex size-9 items-center justify-center rounded-full bg-success-subtle">
          <Check className="size-4.5 text-success-fg" aria-hidden />
        </div>
        <h1 className="mt-group text-2xl font-bold tracking-tight text-fg">Account ready</h1>
        <p className="mt-hair text-base text-fg-secondary">
          If your address needed confirming, check your inbox for the link. Otherwise you can sign
          in now.
        </p>
        <Button className="mt-group w-full" onClick={onBack}>
          Go to sign in
        </Button>
      </>
    )
  }

  return (
    <>
      <h1 className="mt-rhythm text-2xl font-bold tracking-tight text-fg">Set up your account</h1>
      <p className="mt-hair text-base text-fg-secondary">
        Your administrator creates the account; you choose the password.
      </p>

      <form onSubmit={submit} className="mt-group space-y-group" noValidate>
        <Field label="Work email" htmlFor="setup-email">
          <Input
            id="setup-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@kco.ph"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setInvited(null)
            }}
            onBlur={check}
          />
        </Field>

        {checking && (
          <p className="flex items-center gap-hair text-xs text-fg-tertiary">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Checking your invitation
          </p>
        )}

        {invited === false && (
          <FormError>
            There is no open invitation for that address. Ask your administrator to create your
            account, then come back.
          </FormError>
        )}

        {invited === true && (
          <p className="flex items-center gap-hair text-xs text-success-fg">
            <Check className="size-3.5" aria-hidden />
            Invitation found. Choose a password.
          </p>
        )}

        <Field label="Password" htmlFor="setup-password">
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="Confirm password" htmlFor="setup-confirm">
          <Input
            id="setup-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}

        <Button type="submit" className="w-full" disabled={busy || invited === false}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Create my password'}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
      </form>
    </>
  )
}

/* ---------------------------------------------------------------- pieces --- */

function Field({
  label,
  htmlFor,
  action,
  children,
}: {
  label: string
  htmlFor: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-tight">
      <div className="flex items-baseline justify-between gap-tight">
        <label htmlFor={htmlFor} className="text-xs font-medium text-fg-secondary">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-tight rounded-lg border-2 border-danger/30 bg-danger-subtle px-tight py-tight text-sm text-danger-fg"
    >
      <AlertCircle className="mt-px size-4 flex-none" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/**
 * Demo mode is stated plainly rather than hidden. The seeded addresses are
 * shown because there is no password to guess - and because a reviewer opening
 * this build with no backend should not have to read the source to get in.
 */
function DemoNotice() {
  const { signIn } = useAuth()

  return (
    <div className="mt-rhythm rounded-md border border-line bg-bg-inset p-tight">
      <p className="text-xs font-medium text-fg">Demo mode</p>
      <p className="mt-hair text-xs leading-relaxed text-fg-secondary">
        No Supabase project is configured, so nothing is saved to a server. Sign in with a seeded
        account - any password works.
      </p>
      <div className="mt-tight flex flex-wrap gap-tight">
        {[
          { label: 'Admin', email: DEMO_ADMIN_EMAIL },
          { label: 'Sales', email: DEMO_SALES_EMAIL },
        ].map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => void signIn(a.email, 'demo')}
            className="rounded border border-line bg-surface px-tight py-hair text-xs font-medium text-fg transition-colors hover:bg-surface-hover"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * The right-hand panel. Deliberately almost empty: an internal tool's sign-in
 * page has no one to persuade, so this is orientation, not marketing (§5).
 */
function BrandPanel() {
  return (
    <div
      className={cn(
        'relative hidden overflow-hidden border-l border-line bg-bg-inset lg:block',
      )}
    >
      {/* A single hairline grid, low contrast. Texture, not decoration. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 100%)',
        }}
      />

      <div className="relative flex h-full flex-col justify-end p-gutter-lg">
        <p className="max-w-[34ch] text-2xl font-semibold leading-snug tracking-tight text-fg">
          Sales &amp; Chat Support training, in one place.
        </p>
        <p className="mt-group max-w-[46ch] text-base text-fg-secondary">
          Learning materials, practice scenarios, objection handling and assessments for the KCO
          team.
        </p>
        <p className="mt-rhythm text-2xs uppercase tracking-wider text-fg-tertiary">
          Internal use only
        </p>
      </div>
    </div>
  )
}
