import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/common/Logo'
import { useToast } from '@/components/ui/toast'

const MIN_LENGTH = 8

/**
 * Completes a password reset (§9).
 *
 * Reached from the emailed link. Supabase turns that link into a short-lived
 * recovery session before this page renders, which is why the form only asks
 * for the new password - the user is already authenticated at this point, just
 * not yet done.
 *
 * The same screen serves a signed-in user changing their password from
 * Settings; `updateUser` does not care how the session was obtained.
 */
export function ResetPasswordPage() {
  const { updatePassword, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // These two stay inline: they are live constraints on a field the user is
  // still typing into, not the outcome of a submit. Only the failure of the
  // submit itself becomes a toast.
  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && confirm !== password

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < MIN_LENGTH) {
      toast.error('Password is too short', `Use at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      toast.error('The two passwords do not match', 'Retype them and try again.')
      return
    }

    setBusy(true)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      toast.error(
        'Could not set the password',
        err instanceof Error ? err.message : 'The reset link may have expired. Request a new one.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-gutter py-12">
      <div className="w-full max-w-[380px]">
        <Logo />

        {done ? (
          <>
            <div className="mt-rhythm flex size-9 items-center justify-center rounded-full bg-success-subtle">
              <Check className="size-4.5 text-success-fg" aria-hidden />
            </div>
            <h1 className="mt-group text-2xl font-bold tracking-tight text-fg">Password updated</h1>
            <p className="mt-hair text-base text-fg-secondary">
              You can use your new password from now on.
            </p>
            <Button className="mt-group w-full" onClick={() => navigate(user ? '/' : '/login', { replace: true })}>
              {user ? 'Go to dashboard' : 'Sign in'}
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-rhythm text-2xl font-bold tracking-tight text-fg">
              Choose a new password
            </h1>
            <p className="mt-hair text-base text-fg-secondary">
              At least {MIN_LENGTH} characters. Longer is better than complicated.
            </p>

            <form onSubmit={submit} className="mt-group space-y-group" noValidate>
              <div className="space-y-tight">
                <label htmlFor="new-password" className="text-xs font-medium text-fg-secondary">
                  New password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={tooShort || undefined}
                />
                {tooShort ? (
                  <p className="text-xs text-danger-fg">At least {MIN_LENGTH} characters.</p>
                ) : null}
              </div>

              <div className="space-y-tight">
                <label htmlFor="confirm-password" className="text-xs font-medium text-fg-secondary">
                  Confirm password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={mismatch || undefined}
                />
                {mismatch ? (
                  <p className="text-xs text-danger-fg">These do not match.</p>
                ) : null}
              </div>

              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Update password'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
