'use client'

import { createClient } from '@/lib/supabase/client'
import { Suspense, FormEvent, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'

type AuthMode = 'sign-in' | 'sign-up'

function normalizeAuthMessage(message: string, t: (key: string) => string) {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return t('login.invalidCredentials')
  }
  return message
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen overflow-hidden bg-clay-bg text-foreground" />
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const { t } = useI18n()
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryError = searchParams.get('error')

  const queryErrorMessageMap: Record<string, string> = {
    missing_code: t('login.interrupted'),
    auth_failed: t('login.failedGoogle'),
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    queryError ? (queryErrorMessageMap[queryError] ?? t('login.authError')) : null
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  async function syncUserRecord() {
    const response = await fetch('/auth/session', { method: 'POST' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(payload?.error ?? t('login.initAccountError'))
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

      setSuccessMessage(t('login.accountCreated'))
    } catch (error) {
      const message =
        error instanceof Error ? normalizeAuthMessage(error.message, t) : t('login.authFailed')
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
      setErrorMessage(normalizeAuthMessage(error.message, t))
      setIsGoogleLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-clay-bg text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:px-12">
        <section className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-primary-700 uppercase">
            {t('login.heroBadge')}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            {t('login.heroTitle')}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-default-600 sm:text-base">
            {t('login.heroSubtitle')}
          </p>
        </section>

        <section className="clay-card rounded-3xl p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-2 rounded-2xl border border-default-200 bg-default-100/70 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('sign-in')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              className={`w-full rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === 'sign-in'
                  ? 'clay-btn border-primary/30 bg-primary/10 text-primary-700'
                  : 'text-default-600 hover:text-foreground'
              }`}
            >
              {t('login.signIn')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('sign-up')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              className={`w-full rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === 'sign-up'
                  ? 'clay-btn border-primary/30 bg-primary/10 text-primary-700'
                  : 'text-default-600 hover:text-foreground'
              }`}
            >
              {t('login.createAccount')}
            </button>
          </div>

          <form className="space-y-4" onSubmit={handlePasswordAuth}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-default-700" htmlFor="email">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="clay-input w-full px-4 py-3 text-sm outline-none transition"
                placeholder={t('login.emailPlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-default-700" htmlFor="password">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="clay-input w-full px-4 py-3 text-sm outline-none transition"
                placeholder={t('login.passwordPlaceholder')}
              />
            </div>

            {errorMessage && (
              <p className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="clay-btn w-full border-primary/35 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? t('login.pleaseWait')
                : mode === 'sign-in'
                  ? t('login.signInWithPassword')
                  : t('login.createAccount')}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-default-500">
            <span className="h-px flex-1 bg-default-200" />
            <span>{t('common.or')}</span>
            <span className="h-px flex-1 bg-default-200" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isSubmitting || isGoogleLoading}
            className="clay-btn w-full px-4 py-3 text-sm font-semibold text-default-700 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGoogleLoading ? t('login.redirecting') : t('login.continueGoogle')}
          </button>
        </section>
      </div>
    </main>
  )
}
