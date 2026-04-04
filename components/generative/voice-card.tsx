'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { VoiceCardProps } from '@/types/components'

export function VoiceCard({ script, emotion, show_transcript }: VoiceCardProps) {
  const [playing, setPlaying] = useState(false)

  async function handlePlay() {
    setPlaying(true)
    // Wired in Plan 3 — ElevenLabs TTS
    const utterance = new SpeechSynthesisUtterance(script)
    utterance.onend = () => setPlaying(false)
    window.speechSynthesis.speak(utterance)
  }

  const emotionColors: Record<string, string> = {
    neutral: 'bg-default-100',
    warm: 'bg-primary-50',
    urgent: 'clay-card-danger',
    celebratory: 'clay-card-success',
  }

  return (
    <div className={cn('clay-card p-4 flex flex-col gap-3', emotionColors[emotion])}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-default-700">Vela</span>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={playing}
          onPress={handlePlay}
          className="clay-btn"
        >
          {playing ? 'Speaking...' : <><Volume2 size={14} className="inline mr-1" />Listen</>}
        </Button>
      </div>
      {show_transcript && (
        <p className="text-sm text-default-600 leading-relaxed">{script}</p>
      )}
    </div>
  )
}
