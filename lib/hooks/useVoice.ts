'use client'
import { useRef, useState, useCallback } from 'react'

const TTS_ENABLED = false

// Voice IDs
export const VOICE = {
  educational: 'EXAVITQu4vr4xnSDxMaL', // Bella — calm, clear, good for definitions
  announcer:   'ErXwobaYiN019PkySvjV',   // Antoni — warm male, good for market events
} as const

export function useVoice() {
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const urlRef    = useRef<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  const speak = useCallback(async (text: string, voiceId: string = VOICE.educational) => {
    if (!TTS_ENABLED) return
    stop()

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      })
      if (!res.ok) return

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      urlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio
      setIsSpeaking(true)

      audio.onended = () => {
        URL.revokeObjectURL(url)
        urlRef.current  = null
        audioRef.current = null
        setIsSpeaking(false)
      }
      audio.onerror = () => {
        stop()
      }

      await audio.play()
    } catch {
      setIsSpeaking(false)
    }
  }, [stop])

  return { speak, stop, isSpeaking }
}
