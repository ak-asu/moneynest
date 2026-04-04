'use client'
import { useState, useEffect } from 'react'
import { Button } from '@heroui/react'
import { Building2 } from 'lucide-react'

declare global {
  interface Window { Plaid: { create: (config: object) => { open: () => void } } }
}

interface PlaidPathProps {
  onComplete: () => void
}

export function PlaidPath({ onComplete }: PlaidPathProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [institutionName, setInstitutionName] = useState('')

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  async function openPlaid() {
    setStatus('loading')
    try {
      const { linkToken } = await fetch('/api/plaid/link', { method: 'POST' }).then(r => r.json()) as { linkToken: string }
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string) => {
          const result = await fetch('/api/plaid/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicToken }),
          }).then(r => r.json()) as { institutionName: string }
          setInstitutionName(result.institutionName)
          setStatus('done')
        },
        onExit: () => setStatus('idle'),
      })
      handler.open()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Building2 size={48} className="text-primary" />
      <p className="text-sm text-default-600 text-center max-w-xs">
        Securely connect your bank. Vela reads transactions read-only — it can never move money.
      </p>
      {status === 'idle' && (
        <Button variant="primary" size="lg" className="clay-btn" onPress={openPlaid}>
          Connect my bank
        </Button>
      )}
      {status === 'loading' && <p className="text-sm text-primary animate-pulse">Connecting...</p>}
      {status === 'error' && <p className="text-danger text-sm">Connection failed. Please try again.</p>}
      {status === 'done' && (
        <div className="clay-card p-4 text-center flex flex-col gap-3">
          <p className="font-semibold">✅ {institutionName} connected</p>
          <p className="text-xs text-default-500">Your last 30 days of transactions imported</p>
          <Button variant="primary" className="clay-btn" onPress={onComplete}>Go to Dashboard</Button>
        </div>
      )}
    </div>
  )
}
