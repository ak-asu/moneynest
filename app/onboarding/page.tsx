'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, ClipboardList, FileUp, Building2 } from 'lucide-react'
import { FormPath } from './_components/form-path'
import { VoicePath } from './_components/voice-path'
import { DocPath } from './_components/doc-path'
import { PlaidPath } from './_components/plaid-path'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/components/i18n-provider'

const TABS = [
  { id: 'voice', labelKey: 'onboarding.tab.voice', icon: Mic },
  { id: 'form', labelKey: 'onboarding.tab.form', icon: ClipboardList },
  { id: 'doc', labelKey: 'onboarding.tab.doc', icon: FileUp },
  { id: 'plaid', labelKey: 'onboarding.tab.plaid', icon: Building2 },
] as const

type TabId = (typeof TABS)[number]['id']

export default function OnboardingPage() {
  const { t } = useI18n()
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
            <h1 className="text-2xl font-extrabold text-foreground">{t('onboarding.welcome')}</h1>
            <p className="text-default-500 text-sm mt-1">{t('onboarding.subtitle')}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-8 pb-2">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-default-100/60 p-1 border border-default-200">
            {TABS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-xs font-medium transition-all',
                  activeTab === id
                    ? 'clay-btn border-primary/25 bg-primary/10 text-primary-700'
                    : 'text-default-500 hover:text-default-700'
                )}
              >
                <Icon size={15} />
                <span>{t(labelKey)}</span>
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
