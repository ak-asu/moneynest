'use client'
import { useEffect } from 'react'
import { useMusicContext } from './music-manager'
import { useIsReplay } from '@/components/generative/replay-context'

type MusicMood = 'calm' | 'tense' | 'curious' | 'celebratory' | 'silent'

/**
 * Sets the background music mood when the component mounts,
 * and restores 'calm' when it unmounts.
 * Does nothing when rendered inside a historical (replay) message.
 */
export function useMusic(mood: MusicMood) {
  const { setMood } = useMusicContext()
  const isReplay = useIsReplay()
  useEffect(() => {
    if (isReplay) return
    setMood(mood)
    return () => setMood('calm')
  }, [mood, setMood, isReplay])
}
