'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import { isToolUIPart, getToolName } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { COMPONENT_REGISTRY } from './component-registry'
import type { UIMessage } from 'ai'

interface GenerativeMessageProps {
  message: UIMessage
  sessionId: string
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-default-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_hr]:my-3 [&_hr]:border-divider [&_code]:rounded [&_code]:bg-default-100/80 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-default-100/90 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}

export function GenerativeMessage({ message, sessionId }: GenerativeMessageProps) {
  const [savedTools, setSavedTools] = useState<Set<string>>(new Set())

  async function saveComponent(toolCallId: string, toolName: string, output: unknown) {
    const title = (output as any)?.title || toolName.replace(/_/g, ' ')
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, componentName: toolName, componentProps: output, title }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setSavedTools(prev => new Set(prev).add(toolCallId))
    } catch (err) {
      console.error('Failed to save component', err)
    }
  }

  if (message.role === 'user') {
    const userText = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('')
    return (
      <div className="flex justify-end">
        <div className="clay-card bg-primary-50 border-primary-100 px-4 py-3 max-w-lg">
          <MarkdownText text={userText} />
        </div>
      </div>
    )
  }

  // Assistant message — render text parts + tool parts
  return (
    <div className="flex flex-col gap-3 max-w-lg">
      {message.parts?.map((part, idx) => {
        if (part.type === 'text') {
          return (
            <div key={idx} className="clay-card px-4 py-3">
              <MarkdownText text={part.text} />
            </div>
          )
        }

        if (isToolUIPart(part)) {
          const toolName = getToolName(part)

          // Error state
          if (part.state === 'output-error') {
            return (
              <div key={part.toolCallId} className="clay-card p-4 border border-danger-200">
                <p className="text-sm text-danger-600">This component failed to load.</p>
              </div>
            )
          }

          // Not yet complete — show skeleton
          if (part.state !== 'output-available') {
            return (
              <div key={part.toolCallId} className="clay-card p-4 animate-pulse">
                <div className="h-4 bg-default-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-default-200 rounded w-1/2" />
              </div>
            )
          }

          const Component = COMPONENT_REGISTRY[toolName]
          if (!Component) return null

          const output = part.output
          if (output === null || typeof output !== 'object') return null

          const alreadySaved = savedTools.has(part.toolCallId)
          const saveable = [
            'crisis_simulator',
            'mini_game',
            'learning_card',
            'action_plan',
            'document_explainer',
          ].includes(toolName)

          return (
            <div key={part.toolCallId} className="relative group">
              <Component {...(output as Record<string, unknown>)} />
              {saveable && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() =>
                    !alreadySaved &&
                    saveComponent(part.toolCallId, toolName, part.output)
                  }
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity clay-btn"
                  isDisabled={alreadySaved}
                >
                  {alreadySaved ? 'Saved' : 'Save'}
                </Button>
              )}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
