import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { FullPageSpinner } from '@/components/common/FullPageSpinner'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/common/Logo'

/**
 * Where Supabase returns the browser after Google OAuth or an email link
 * (§55).
 *
 * The client library has already exchanged the code for a session by the time
 * this renders - `detectSessionInUrl` handles that - so there is nothing to do
 * but wait for AuthProvider to observe the new session and then get out of the
 * way. This page exists so that redirect lands somewhere deliberate instead of
 * on the dashboard with a URL full of tokens.
 */
export function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Supabase reports OAuth failures as query parameters rather than throwing.
  const providerError = params.get('error_description') ?? params.get('error')

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    // If no session has appeared in a few seconds, something went wrong
    // upstream. Better to say so than to spin forever.
    const t = window.setTimeout(() => setTimedOut(true), 8000)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    // Strip the tokens from the address bar once we are done with them.
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  if (providerError) {
    return <CallbackError message={decodeURIComponent(providerError)} />
  }

  if (user) return <Navigate to="/" replace />

  if (!loading && timedOut) {
    return (
      <CallbackError
        message="We did not receive a session from the identity provider. This usually means the Google provider is not fully configured in Supabase, or the redirect URL does not match."
      />
    )
  }

  return <FullPageSpinner label="Completing sign-in" />
}

function CallbackError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-gutter py-12">
      <div className="w-full max-w-[420px]">
        <Logo />
        <div className="mt-rhythm rounded-lg border border-line bg-surface p-card">
          <div className="flex size-8 items-center justify-center rounded-full bg-danger-subtle">
            <AlertCircle className="size-4.5 text-danger-fg" aria-hidden />
          </div>
          <h1 className="mt-tight text-xl font-bold tracking-tight text-fg">Sign-in failed</h1>
          <p className="mt-hair text-sm leading-relaxed text-fg-secondary">{message}</p>
          <Button variant="secondary" className="mt-group w-full" onClick={() => (window.location.href = '/login')}>
            Back to sign in
          </Button>
        </div>
      </div>
    </div>
  )
}
