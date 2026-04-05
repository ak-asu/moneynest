'use client'
import { useCallback, useRef } from 'react'

// Pre-defined SFX descriptions for common moments
export const SFX = {
  BUTTON_CLICK: 'soft tactile button click, clay game interface',
  CREDIT_UP: 'soft cheerful chime, credit score rising',
  CREDIT_DOWN: 'low concerned chime, credit score dropping',
  CRISIS_START: 'tense rising tone, financial crisis begins',
  CRISIS_END: 'relieved descending tone, financial crisis resolved',
  GAME_WIN: 'bright celebratory chime, game won',
  GAME_LOSE: 'dull thud, game lost',
  GAME_CORRECT: 'positive ding, correct choice in mini-game'
  ,
} as const

export function useSFX() {
  const cacheRef = useRef(new Map<string, Promise<HTMLAudioElement | null>>())

  const loadAudio = useCallback(async (description: string, duration?: number) => {
    const cacheKey = `${description}::${duration ?? ''}`
    const existing = cacheRef.current.get(cacheKey)
    if (existing) return existing

    const pending = (async () => {
      try {
        const res = await fetch('/api/elevenlabs/sfx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, duration }),
        })
        if (!res.ok) return null
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => URL.revokeObjectURL(url)
        return audio
      } catch {
        return null
      }
    })()

    cacheRef.current.set(cacheKey, pending)
    return pending
  }, [])

  const play = useCallback(
    async (description: string, duration?: number) => {
      const audio = await loadAudio(description, duration)
      if (!audio) return
      try {
        audio.currentTime = 0
        await audio.play()
      } catch {}
    },
    [loadAudio]
  )

  const preload = useCallback(
    async (descriptions: Array<{ description: string; duration?: number }>) => {
      await Promise.all(descriptions.map((item) => loadAudio(item.description, item.duration)))
    },
    [loadAudio]
  )

  return { play, preload, SFX }
}
