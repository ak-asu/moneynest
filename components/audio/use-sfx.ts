'use client'
import { useCallback } from 'react'

// Pre-defined SFX descriptions for common moments
export const SFX = {
  CRISIS_START: 'low heartbeat pulse, tense and ominous',
  CRISIS_ESCALATE: 'urgent alarm beep, financial danger warning',
  CRISIS_RESOLVE: 'gentle relief chime, calm resolution',
  GAME_WIN: 'cheerful coin collection sound, success',
  GAME_LOSE: 'soft buzzer, gentle failure tone',
  GAME_CORRECT: 'cash register ding, money sound',
  MILESTONE: 'small celebration chime, achievement unlocked',
  UPLOAD: 'soft whoosh, document processing',
} as const

export function useSFX() {
  const play = useCallback(async (description: string, duration?: number) => {
    try {
      const res = await fetch('/api/elevenlabs/sfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, duration }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch {}
  }, [])

  return { play, SFX }
}
