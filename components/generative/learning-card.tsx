'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ExternalLink } from 'lucide-react'
import type { LearningCardProps } from '@/types/components'
import { useIsReplay } from '@/components/generative/replay-context'

export function LearningCard({
  title,
  explanation,
  key_takeaway,
  image_prompt,
  image_url,
  concept,
  links,
}: LearningCardProps) {
  const isReplay = useIsReplay()
  const [imgSrc, setImgSrc] = useState(image_url)

  useEffect(() => {
    if (isReplay || imgSrc || !image_prompt) return
    fetch('/api/gemini/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: image_prompt, concept }),
    })
      .then((r) => {
        if (r.ok) return r.json()
      })
      .then((d) => {
        if (d?.url) setImgSrc(d.url)
      })
      .catch(() => {})
  }, [image_prompt, imgSrc, concept, isReplay])

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
      <div className="text-sm text-default-600 leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
      </div>
      <div className="bg-primary-50 rounded-2xl p-3 border border-primary-100">
        <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">
          Key takeaway
        </p>
        <p className="text-sm font-medium text-primary-800">{key_takeaway}</p>
      </div>
      {links && links.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-default-400 uppercase tracking-wide">
            Resources
          </p>
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
