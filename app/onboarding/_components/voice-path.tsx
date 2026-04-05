'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import { Mic, MicOff } from 'lucide-react'
import { useConversation } from '@11labs/react'
import type { DisconnectionDetails } from '@11labs/react'
import { useI18n } from '@/components/i18n-provider'

interface VoicePathProps {
  onComplete: () => void
}

type Status = 'idle' | 'connecting' | 'active' | 'saving' | 'done' | 'error'

export function VoicePath({ onComplete }: VoicePathProps) {
  const { t, setLocale } = useI18n()
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string[]>([])
  // Ref mirrors transcript so onDisconnect (captured at startSession time) always
  // reads the latest messages rather than the stale closure value.
  const transcriptRef = useRef<string[]>([])
  // True once the WebSocket is established (onConnect has fired).
  const hasConnected = useRef(false)
  // True once at least one message has been exchanged (real conversation started).
  const hasMessages = useRef(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  async function saveProfileFromTranscript(lines: string[]) {
    setStatus('saving')
    try {
      const res = await fetch('/api/elevenlabs/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: lines }),
      })
      const body = (await res.json()) as { profile?: { language?: string }; error?: string }
      if (!res.ok) {
        throw new Error(body.error ?? `Save failed (${res.status})`)
      }
      const isSpanish =
        body.profile?.language === 'es' || lines.some((line) => /[áéíóúñ¿¡üÁÉÍÓÚÑÜ]/.test(line))
      if (isSpanish) {
        await setLocale('es')
      }
      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save profile.')
      setStatus('error')
    }
  }

  const conversation = useConversation({
    onConnect: () => {
      hasConnected.current = true
      setStatus('active')
    },
    onMessage: (props: { message: string; source: 'user' | 'ai' }) => {
      hasMessages.current = true
      const line = `${props.source === 'ai' ? t('onboarding.voice.vela') : t('onboarding.voice.you')}: ${props.message}`
      transcriptRef.current = [...transcriptRef.current, line]
      setTranscript(transcriptRef.current)
    },
    onDisconnect: (details: DisconnectionDetails) => {
      const connected = hasConnected.current
      const hadConversation = hasMessages.current
      const lines = transcriptRef.current
      hasConnected.current = false
      hasMessages.current = false
      transcriptRef.current = []

      if (!connected) {
        setStatus('idle')
        return
      }

      if (details.reason === 'error') {
        const reason =
          details.message ?? details.closeReason ?? `code ${details.closeCode ?? 'unknown'}`
        setErrorMsg(`Connection error: ${reason}`)
        setStatus('error')
        return
      }

      if (details.reason === 'agent' && !hadConversation) {
        const reason = details.closeReason ?? 'Agent ended the session immediately'
        setErrorMsg(`Voice assistant disconnected before conversation started: ${reason}`)
        setStatus('error')
        return
      }

      // User stopped or agent ended after a real conversation — extract & save profile.
      void saveProfileFromTranscript(lines)
    },
    onError: (message: string) => {
      hasConnected.current = false
      hasMessages.current = false
      transcriptRef.current = []
      setErrorMsg(message)
      setStatus('error')
    },
  })

  async function start() {
    setStatus('connecting')
    setErrorMsg(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const res = await fetch('/api/elevenlabs/agent')
      const body = (await res.json()) as { signedUrl?: string; error?: string }
      if (!res.ok) {
        throw new Error(body.error ?? `Agent API error ${res.status}`)
      }
      const { signedUrl } = body as { signedUrl: string }
      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            firstMessage: t('onboarding.voice.firstMessage'),
          },
        },
      })
    } catch (err) {
      hasConnected.current = false
      hasMessages.current = false
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start voice session.')
      setStatus('error')
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
      {(status === 'idle' || status === 'error') && (
        <>
          {errorMsg && <p className="text-sm text-danger text-center max-w-xs">{errorMsg}</p>}
          <p className="text-sm text-default-600 text-center max-w-xs leading-relaxed">
            {t('onboarding.voice.prompt')}
          </p>
          <Button variant="primary" size="lg" className="clay-btn px-8 py-3" onPress={start}>
            {status === 'error' ? 'Try again' : t('onboarding.voice.start')}
          </Button>
        </>
      )}
      {status === 'connecting' && (
        <p className="text-sm text-default-500">{t('onboarding.voice.connecting')}</p>
      )}
      {status === 'saving' && <p className="text-sm text-default-500">Saving your profile…</p>}
      {status === 'active' && (
        <>
          <div className="w-full bg-default-50 rounded-2xl p-5 max-h-52 overflow-y-auto space-y-3">
            {transcript.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed">
                {line}
              </p>
            ))}
            <div ref={transcriptEndRef} />
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
