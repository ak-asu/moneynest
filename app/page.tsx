import { createClient } from '@/lib/supabase/server'
import type { DbProfile, DbUser } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // profiles.user_id → public.users.id (not auth UUID directly)
  const { data: userRow } = (await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()) as { data: Pick<DbUser, 'id'> | null }

  if (!userRow) redirect('/onboarding')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', userRow.id)
    .single()) as { data: Pick<DbProfile, 'onboarding_completed'> | null }

  if (!profile?.onboarding_completed) redirect('/onboarding')

  redirect('/dashboard')
}
