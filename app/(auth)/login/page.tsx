'use client'

import { createClient } from '@/lib/supabase/client'
import { Suspense, FormEvent, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type AuthMode = 'sign-in' | 'sign-up'

const QUERY_ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'Google sign-in was interrupted. Please try again.',
  auth_failed: 'We could not complete Google sign-in. Please try again.',
}

function normalizeAuthMessage(message: string) {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }
  return message
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50" />}
    >
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    queryError ? QUERY_ERROR_MESSAGES[queryError] ?? 'Authentication error. Please try again.' : null
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  async function syncUserRecord() {
    const response = await fetch('/auth/session', { method: 'POST' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(payload?.error ?? 'Failed to initialize your account.')
    }
  }

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        await syncUserRecord()
        router.replace('/')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (data.session) {
        await syncUserRecord()
        router.replace('/')
        return
      }

      setSuccessMessage('Account created. Check your email to verify your address, then sign in.')
    } catch (error) {
      const message = error instanceof Error ? normalizeAuthMessage(error.message) : 'Authentication failed.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function signInWithGoogle() {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsGoogleLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setErrorMessage(normalizeAuthMessage(error.message))
      setIsGoogleLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:px-12">
        <section className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-cyan-100 uppercase">
            Vela Financial Companion
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Manage life with calm, clear money decisions.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Track your financial pulse, spot risks early, and build confidence with guidance made for real everyday choices.
          </p>
        </section>

        <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-slate-900/60 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('sign-in')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              className={`w-full rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === 'sign-in' ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('sign-up')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              className={`w-full rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === 'sign-up' ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Create account
            </button>
          </div>

          <form className="space-y-4" onSubmit={handlePasswordAuth}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="At least 6 characters"
              />
            </div>

            {errorMessage && (
              <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign in with password' : 'Create account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-slate-400">
            <span className="h-px flex-1 bg-white/15" />
            <span>or</span>
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isSubmitting || isGoogleLoading}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>
        </section>
      </div>
    </main>
  )
}
