'use client'
import { useEffect } from 'react'
import { useMusicContext } from './music-manager'

type MusicMood = 'calm' | 'tense' | 'curious' | 'celebratory' | 'silent'

/**
 * Sets the background music mood when the component mounts,
 * and restores 'calm' when it unmounts.
 */
export function useMusic(mood: MusicMood) {
  const { setMood } = useMusicContext()
  // Note: React Strict Mode double-fires this in development (mount → cleanup → remount).
  // The AbortController in MusicProvider makes the extra call benign.
  useEffect(() => {
    setMood(mood)
    return () => setMood('calm')
  }, [mood, setMood])
}
