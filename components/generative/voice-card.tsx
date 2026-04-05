'use client'
import { Button } from '@heroui/react'
import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { VoiceCardProps } from '@/types/components'
import { useTTS } from '@/components/audio/use-tts'

export function VoiceCard({
  script,
  voice_id,
  language,
  emotion,
  show_transcript,
}: VoiceCardProps) {
  const { speak, stop, isPlaying } = useTTS()

  function handlePlay() {
    if (isPlaying) {
      stop()
      return
    }
    speak(script, { language, persona: undefined, voiceId: voice_id })
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
        <span className="text-sm font-semibold text-default-700">Cents</span>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={isPlaying}
          onPress={handlePlay}
          className="clay-btn"
        >
          {isPlaying ? (
            'Speaking...'
          ) : (
            <>
              <Volume2 size={14} className="inline mr-1" />
              Listen
            </>
          )}
        </Button>
      </div>
      {show_transcript && <p className="text-sm text-default-600 leading-relaxed">{script}</p>}
    </div>
  )
}
