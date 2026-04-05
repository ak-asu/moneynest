'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@heroui/react'
import type { LearningCardProps } from '@/types/components'
import { useMusic } from '@/components/audio/use-music'
import { useIsReplay } from '@/components/generative/replay-context'

export function LearningCard({ title, explanation, key_takeaway, image_prompt, image_url, concept, language }: LearningCardProps) {
  const isReplay = useIsReplay()
  useMusic('curious')
  const [imgSrc, setImgSrc] = useState(image_url)
  const [songPlaying, setSongPlaying] = useState(false)
  const songAudioRef = useRef<HTMLAudioElement | null>(null)
  const songUrlRef = useRef<string | null>(null)
  const songAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (isReplay || image_url || !image_prompt) return
    fetch('/api/gemini/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: image_prompt, concept }),
    })
      .then(r => { if (r.ok) return r.json() })
      .then(d => { if (d?.url) setImgSrc(d.url) })
      .catch(() => {})
  }, [image_prompt, image_url, concept, isReplay])

  useEffect(() => {
    return () => {
      songAbortRef.current?.abort()
      songAudioRef.current?.pause()
      if (songUrlRef.current) URL.revokeObjectURL(songUrlRef.current)
    }
  }, [])

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <h3 className="font-bold text-base text-primary">{title}</h3>
      {imgSrc && (
        <div className="relative h-40 w-full overflow-hidden rounded-2xl">
          <Image
            src={imgSrc}
            alt={title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      )}
      <p className="text-sm text-default-600 leading-relaxed">{explanation}</p>
      <div className="bg-primary-50 rounded-2xl p-3 border border-primary-100">
        <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Key takeaway</p>
        <p className="text-sm font-medium text-primary-800">{key_takeaway}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        isDisabled={songPlaying}
        onPress={async () => {
          setSongPlaying(true)
          songAbortRef.current?.abort()
          songAbortRef.current = new AbortController()
          const signal = songAbortRef.current.signal
          try {
            const res = await fetch('/api/elevenlabs/dub', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mood: 'curious', targetLanguage: language || 'en' }),
              signal,
            })
            if (!res.ok) { setSongPlaying(false); return }
            const blob = await res.blob()
            if (signal.aborted) return
            if (songUrlRef.current) URL.revokeObjectURL(songUrlRef.current)
            const url = URL.createObjectURL(blob)
            songUrlRef.current = url
            const audio = new Audio(url)
            songAudioRef.current = audio
            audio.onended = () => {
              URL.revokeObjectURL(url)
              songUrlRef.current = null
              songAudioRef.current = null
              setSongPlaying(false)
            }
            await audio.play()
          } catch (err) {
            if ((err as Error).name !== 'AbortError') console.error('Concept song error:', err)
            setSongPlaying(false)
          }
        }}
      >
        {songPlaying ? 'Playing...' : '🎵 Concept song'}
      </Button>
    </div>
  )
}
