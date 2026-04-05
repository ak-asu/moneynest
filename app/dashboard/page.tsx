import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { HealthScoreRing } from '@/components/health-score-ring'
import { DashboardClient } from './_components/dashboard-client'
import type { DbProfile, DbSuggestion, DbUser } from '@/types/database'
import { getServerI18n } from '@/lib/i18n/server'

const PERSONA_KEYS: Record<string, string> = {
  gig_worker: 'persona.gig_worker',
  student: 'persona.student',
  immigrant: 'persona.immigrant',
  retiree: 'persona.retiree',
  single_parent: 'persona.single_parent',
  other: 'persona.other',
}

export default async function DashboardPage() {
  const { t } = await getServerI18n()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dbUser } = (await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()) as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) redirect('/onboarding')

  const now = new Date().toISOString()
  const [profileRes, suggestionsRes] = (await Promise.all([
    supabase
      .from('profiles')
      .select('financial_health_score, persona, income_monthly')
      .eq('user_id', dbUser.id)
      .single(),
    supabase
      .from('suggestions')
      .select('*')
      .eq('user_id', dbUser.id)
      .eq('dismissed', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false }),
  ])) as [
    { data: Pick<DbProfile, 'financial_health_score' | 'persona' | 'income_monthly'> | null },
    { data: DbSuggestion[] | null },
  ]

  const profile = profileRes.data
  const suggestions = suggestionsRes.data ?? []

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8 max-w-5xl">
          <div>
            <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
            <p className="text-default-500 text-sm mt-1">
              {t('dashboard.welcome', {
                persona: profile ? `, ${t(PERSONA_KEYS[profile.persona] ?? 'persona.other')}` : '',
              })}
            </p>
          </div>

          {/* Health Score Card */}
          <div className="clay-card p-6 flex flex-col sm:flex-row items-center gap-6 max-w-sm">
            <HealthScoreRing score={profile?.financial_health_score ?? 0} />
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wide mb-1">
                {t('dashboard.healthScore')}
              </p>
              <p className="text-sm text-default-600">
                {profile?.financial_health_score != null
                  ? profile.financial_health_score >= 70
                    ? t('dashboard.healthExcellent')
                    : profile.financial_health_score >= 40
                      ? t('dashboard.healthProgress')
                      : t('dashboard.healthBuild')
                  : t('dashboard.healthMissing')}
              </p>
            </div>
          </div>

          {/* Proactive Suggestions */}
          <DashboardClient initialSuggestions={suggestions} />
        </div>
      </main>
    </div>
  )
}
