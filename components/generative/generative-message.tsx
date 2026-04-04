'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import { isToolUIPart, getToolName } from 'ai'
import { COMPONENT_REGISTRY } from './component-registry'
import type { UIMessage } from 'ai'

interface GenerativeMessageProps {
  message: UIMessage
  sessionId: string
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
        <div className="clay-card bg-primary-50 border-primary-100 px-4 py-3 max-w-xs">
          <p className="text-sm">{userText}</p>
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
              <p className="text-sm leading-relaxed">{part.text}</p>
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
