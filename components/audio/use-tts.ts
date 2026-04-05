'use client'
import { useState, useCallback, useRef } from 'react'

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioEl] = useState(() => (typeof window !== 'undefined' ? new Audio() : null))
  const playingRef = useRef(false)
  const urlRef = useRef<string | null>(null)

  const speak = useCallback(
    async (
      text: string,
      options?: {
        voiceId?: string
        language?: string
        persona?: string
      }
    ) => {
      if (!audioEl || playingRef.current) return
      playingRef.current = true
      setIsPlaying(true)

      try {
        const res = await fetch('/api/elevenlabs/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, ...options }),
        })
        if (!res.ok) throw new Error('TTS failed')

        const blob = await res.blob()
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        audioEl.src = url
        audioEl.onended = () => {
          playingRef.current = false
          setIsPlaying(false)
          if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current)
            urlRef.current = null
          }
        }
        await audioEl.play()
      } catch {
        playingRef.current = false
        setIsPlaying(false)
      }
    },
    [audioEl]
  )

  const stop = useCallback(() => {
    audioEl?.pause()
    if (audioEl) audioEl.src = ''
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    playingRef.current = false
    setIsPlaying(false)
  }, [audioEl])

  return { speak, stop, isPlaying }
}
