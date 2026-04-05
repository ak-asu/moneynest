'use client'
import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

type MusicMood = 'calm' | 'tense' | 'curious' | 'celebratory' | 'silent'

interface MusicContextValue {
  currentMood: MusicMood
  setMood: (mood: MusicMood) => void
}

const MusicContext = createContext<MusicContextValue>({
  currentMood: 'calm',
  setMood: () => {},
})

export function useMusicContext() {
  return useContext(MusicContext)
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentMood, setCurrentMood] = useState<MusicMood>('calm')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentUrlRef = useRef<string | null>(null)
  const currentMoodRef = useRef<MusicMood>('calm')
  const abortRef = useRef<AbortController | null>(null)

  const setMood = useCallback(async (mood: MusicMood) => {
    if (mood === currentMoodRef.current) return
    currentMoodRef.current = mood
    setCurrentMood(mood)

    // Cancel any in-flight fetch
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    // Stop and clean up current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current)
      currentUrlRef.current = null
    }

    if (mood === 'silent') return

    try {
      const res = await fetch('/api/elevenlabs/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
        signal,
      })
      if (!res.ok || res.status === 204 || signal.aborted) return
      const blob = await res.blob()
      if (signal.aborted) return
      const url = URL.createObjectURL(blob)
      currentUrlRef.current = url
      const audio = new Audio(url)
      audio.loop = true
      audio.volume = 0.15
      audioRef.current = audio
      await audio.play().catch(err => {
        if (err.name !== 'NotAllowedError') console.error('Music playback error:', err)
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('Music fetch error:', err)
    }
  }, []) // stable — uses refs, not state

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      audioRef.current?.pause()
      audioRef.current = null
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current)
        currentUrlRef.current = null
      }
    }
  }, [])

  return (
    <MusicContext.Provider value={{ currentMood, setMood }}>
      {children}
    </MusicContext.Provider>
  )
}
