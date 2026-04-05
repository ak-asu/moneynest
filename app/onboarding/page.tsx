'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, ClipboardList, FileUp, Building2 } from 'lucide-react'
import { FormPath } from './_components/form-path'
import { VoicePath } from './_components/voice-path'
import { DocPath } from './_components/doc-path'
import { PlaidPath } from './_components/plaid-path'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { id: 'voice', label: 'Talk to me', icon: Mic },
  { id: 'form', label: 'Fill it in', icon: ClipboardList },
  { id: 'doc', label: 'Upload docs', icon: FileUp },
  { id: 'plaid', label: 'Connect bank', icon: Building2 },
] as const

type TabId = (typeof TABS)[number]['id']

export default function OnboardingPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('voice')

  function handleComplete() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-clay-bg">
      <div className="clay-card w-full max-w-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Welcome to Vela 🕯️</h1>
            <p className="text-default-500 text-sm mt-1">
              Set up your financial profile to get started.
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-8 pb-2">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-default-100/60 p-1 border border-white/10">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-xs font-medium transition-all',
                  activeTab === id
                    ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm border border-white/20'
                    : 'text-muted hover:text-default-foreground'
                )}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-8 py-6">
          {activeTab === 'voice' && <VoicePath onComplete={handleComplete} />}
          {activeTab === 'form' && <FormPath onComplete={handleComplete} />}
          {activeTab === 'doc' && <DocPath onComplete={handleComplete} />}
          {activeTab === 'plaid' && <PlaidPath onComplete={handleComplete} />}
        </div>
      </div>
    </div>
  )
}
