'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { LearningCardProps } from '@/types/components'

export function LearningCard({ title, explanation, key_takeaway, image_prompt, image_url, concept }: LearningCardProps) {
  const [imgSrc, setImgSrc] = useState(image_url)

  useEffect(() => {
    if (!image_url && image_prompt) {
      fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: image_prompt, concept }),
      })
        .then(r => { if (r.ok) return r.json() })
        .then(d => { if (d?.url) setImgSrc(d.url) })
        .catch(() => {})
    }
  }, [image_prompt, image_url, concept])

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
    </div>
  )
}
