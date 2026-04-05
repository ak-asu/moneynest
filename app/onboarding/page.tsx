'use client'
import { useRouter } from 'next/navigation'
import { Tabs, TabList, Tab, TabPanel } from '@heroui/react'
import { Mic, ClipboardList, FileUp, Building2 } from 'lucide-react'
import { FormPath } from './_components/form-path'
import { VoicePath } from './_components/voice-path'
import { DocPath } from './_components/doc-path'
import { PlaidPath } from './_components/plaid-path'

export default function OnboardingPage() {
  const router = useRouter()

  function handleComplete() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-clay-bg">
      <div className="clay-card p-8 w-full max-w-lg flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-primary">Welcome to Vela 🕯️</h1>
          <p className="text-default-500 text-sm mt-2">Let&apos;s set up your financial profile. Choose how you&apos;d like to start.</p>
        </div>

        <Tabs>
          <TabList className="clay-card p-1 flex gap-1">
            <Tab id="voice" className="clay-btn">
              <span className="flex items-center gap-1.5"><Mic size={14} />Talk to me</span>
            </Tab>
            <Tab id="form" className="clay-btn">
              <span className="flex items-center gap-1.5"><ClipboardList size={14} />Fill it in</span>
            </Tab>
            <Tab id="doc" className="clay-btn">
              <span className="flex items-center gap-1.5"><FileUp size={14} />Upload docs</span>
            </Tab>
            <Tab id="plaid" className="clay-btn">
              <span className="flex items-center gap-1.5"><Building2 size={14} />Connect bank</span>
            </Tab>
          </TabList>

          <TabPanel id="voice">
            <VoicePath onComplete={handleComplete} />
          </TabPanel>
          <TabPanel id="form">
            <FormPath onComplete={handleComplete} />
          </TabPanel>
          <TabPanel id="doc">
            <DocPath onComplete={handleComplete} />
          </TabPanel>
          <TabPanel id="plaid">
            <PlaidPath onComplete={handleComplete} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  )
}
