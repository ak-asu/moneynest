import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { NextResponse } from 'next/server'

type UsersTable = {
  upsert: (
    values: Database['public']['Tables']['users']['Insert'],
    options: { onConflict: string }
  ) => Promise<{ error: { message: string } | null }>
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const usersTable = supabase.from('users') as unknown as UsersTable
  const { error } = await usersTable.upsert(
    { auth_id: user.id, email: user.email },
    { onConflict: 'auth_id' }
  )

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to initialize user account.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}