'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import { Mic, MicOff } from 'lucide-react'
import { useConversation } from '@11labs/react'
import { useI18n } from '@/components/i18n-provider'

interface VoiceModeButtonProps {
  onTranscript: (text: string) => void
}

export function VoiceModeButton({ onTranscript }: VoiceModeButtonProps) {
  const { t } = useI18n()
  const [active, setActive] = useState(false)
  const [pending, setPending] = useState(false)

  const conversation = useConversation({
    onMessage: ({ message, source }: { message: string; source: string }) => {
      if (source === 'user') onTranscript(message)
    },
    onError: (err: unknown) => {
      console.error('Voice agent error:', err)
      setActive(false)
    },
    onDisconnect: () => setActive(false),
  })

  async function startVoice() {
    setPending(true)
    try {
      const res = await fetch('/api/elevenlabs/agent')
      if (!res.ok) return
      const data = await res.json()
      if (!data.signedUrl) throw new Error('No signed URL returned from agent route')
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await conversation.startSession({ signedUrl: data.signedUrl })
      setActive(true)
    } catch (err) {
      console.error('Failed to start voice:', err)
    } finally {
      setPending(false)
    }
  }

  async function stopVoice() {
    try {
      await conversation.endSession()
    } catch (err) {
      console.error('Failed to end voice session:', err)
      setActive(false)
    }
  }

  return (
    <Button
      isIconOnly
      variant={active ? 'danger' : 'ghost'}
      isDisabled={pending}
      onPress={active ? stopVoice : startVoice}
      className="clay-btn"
      aria-label={active ? t('chat.voiceEndAria') : t('chat.voiceStartAria')}
    >
      {active ? <MicOff size={16} /> : <Mic size={16} />}
    </Button>
  )
}
