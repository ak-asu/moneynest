'use client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@heroui/react'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Vela</h1>
        <p className="text-default-500 mt-2">Your financial guiding light</p>
      </div>
      <Button onPress={signInWithGoogle} size="lg" variant="primary">
        Continue with Google
      </Button>
    </div>
  )
}
