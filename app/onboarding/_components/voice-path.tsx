'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import { Mic, MicOff } from 'lucide-react'
import { useConversation } from '@11labs/react'
import { useI18n } from '@/components/i18n-provider'

interface VoicePathProps {
  onComplete: () => void
}

export function VoicePath({ onComplete }: VoicePathProps) {
  const { t } = useI18n()
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'done'>('idle')
  const [transcript, setTranscript] = useState<string[]>([])

  const conversation = useConversation({
    onMessage: (props: { message: string; source: 'user' | 'ai' }) => {
      setTranscript((prev) => [
        ...prev,
        `${props.source === 'ai' ? t('onboarding.voice.vela') : t('onboarding.voice.you')}: ${props.message}`,
      ])
    },
    onDisconnect: () => {
      setStatus('done')
    },
  })

  async function start() {
    setStatus('connecting')
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const res = await fetch('/api/elevenlabs/agent')
      const { signedUrl } = (await res.json()) as { signedUrl: string }
      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            firstMessage: t('onboarding.voice.firstMessage'),
          },
        },
      })
      setStatus('active')
    } catch {
      setStatus('idle')
    }
  }

  async function stop() {
    await conversation.endSession()
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <span className="text-5xl">✅</span>
        <p className="font-bold text-lg">{t('onboarding.voice.setupDoneTitle')}</p>
        <p className="text-default-500 text-sm text-center">
          {t('onboarding.voice.setupDoneSubtitle')}
        </p>
        <Button variant="primary" className="clay-btn" onPress={onComplete}>
          {t('onboarding.voice.goDashboard')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center clay-card ${status === 'active' ? 'animate-pulse bg-primary-100' : ''}`}
      >
        {status === 'active' ? (
          <Mic size={36} className="text-primary" />
        ) : (
          <Mic size={36} className="text-default-400" />
        )}
      </div>
      {status === 'idle' && (
        <>
          <p className="text-sm text-default-600 text-center max-w-xs leading-relaxed">
            {t('onboarding.voice.prompt')}
          </p>
          <Button variant="primary" size="lg" className="clay-btn px-8 py-3" onPress={start}>
            {t('onboarding.voice.start')}
          </Button>
        </>
      )}
      {status === 'connecting' && (
        <p className="text-sm text-default-500">{t('onboarding.voice.connecting')}</p>
      )}
      {status === 'active' && (
        <>
          <div className="w-full bg-default-50 rounded-2xl p-5 max-h-52 overflow-y-auto space-y-3">
            {transcript.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed">
                {line}
              </p>
            ))}
          </div>
          <Button
            variant="outline"
            className="clay-btn px-6 py-3 flex items-center gap-2"
            onPress={stop}
          >
            <MicOff size={16} />
            {t('onboarding.voice.done')}
          </Button>
        </>
      )}
    </div>
  )
}
