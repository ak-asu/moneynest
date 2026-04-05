'use client'
import { useState } from 'react'
import {
  Button,
  Chip,
  Modal,
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
  ModalBody,
  ModalCloseTrigger,
} from '@heroui/react'
import { isToolUIPart, getToolName } from 'ai'
import { Gamepad2, Maximize2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { COMPONENT_REGISTRY } from './component-registry'
import { ReplayProvider } from './replay-context'
import type { UIMessage } from 'ai'

const GAME_TYPE_LABELS: Record<string, string> = {
  allocation_puzzle: 'Allocation',
  time_pressure: 'Time Challenge',
  tradeoff_slider: 'Tradeoff',
  drag_drop: 'Drag & Drop',
  insurance_card_game: 'Insurance Card',
  credit_quest_game: 'Credit Quest',
  term_match: 'Term Match',
  fin_word: 'FinWord',
  wealth_farm: 'Wealth Farm',
}

interface GameCardProps {
  output: Record<string, unknown>
  onPlay: () => void
  onSave: () => void
  alreadySaved: boolean
}

function GameCard({ output, onPlay, onSave, alreadySaved }: GameCardProps) {
  const title = typeof output.title === 'string' ? output.title : 'Mini Game'
  const gameType = typeof output.game_type === 'string' ? output.game_type : ''
  const instructions = typeof output.instructions === 'string' ? output.instructions : ''

  return (
    <div className="clay-card p-5 flex flex-col gap-3 rounded-2xl bg-default-50">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug flex-1 min-w-0 truncate">{title}</h3>
        {gameType && (
          <Chip size="sm" color="default" variant="soft" className="shrink-0 text-xs">
            {GAME_TYPE_LABELS[gameType] ?? gameType}
          </Chip>
        )}
      </div>
      {instructions && <p className="text-xs text-default-400">{instructions}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onPress={onPlay} className="clay-btn flex-1 gap-1">
          <Gamepad2 size={13} aria-hidden="true" />
          Play Game
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={onSave}
          isDisabled={alreadySaved}
          className="clay-btn"
        >
          {alreadySaved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

interface GenerativeMessageProps {
  message: UIMessage
  sessionId: string
  isReplay?: boolean
}

interface ExpandedWidget {
  name: string
  output: Record<string, unknown>
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-default-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_hr]:my-3 [&_hr]:border-divider [&_code]:rounded [&_code]:bg-default-100/80 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-default-100/90 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}

export function GenerativeMessage({
  message,
  sessionId,
  isReplay = false,
}: GenerativeMessageProps) {
  const [savedTools, setSavedTools] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<ExpandedWidget | null>(null)

  async function saveComponent(toolCallId: string, toolName: string, output: unknown) {
    const title = (output as any)?.title || toolName.replace(/_/g, ' ')
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, componentName: toolName, componentProps: output, title }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setSavedTools((prev) => new Set(prev).add(toolCallId))
    } catch (err) {
      console.error('Failed to save component', err)
    }
  }

  if (message.role === 'user') {
    const rawText = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('')
    // Strip any [Vela-System: ...] prefixes injected by game/simulation outcome events
    const userText = rawText.replace(/^\[Vela-System:[^\]]*\]\n?/gm, '').trim()
    if (!userText) return null
    return (
      <div className="flex justify-end">
        <div className="clay-card bg-primary-50 border-primary-100 px-4 py-3 max-w-lg">
          <MarkdownText text={userText} />
        </div>
      </div>
    )
  }

  const ExpandedComponent = expanded ? COMPONENT_REGISTRY[expanded.name] : null

  // Assistant message — render text parts + tool parts
  return (
    <>
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
            const expandable = !['voice_card', 'profile_snapshot', 'action_plan'].includes(toolName)

            if (toolName === 'mini_game') {
              return (
                <GameCard
                  key={part.toolCallId}
                  output={output as Record<string, unknown>}
                  onPlay={() =>
                    setExpanded({ name: toolName, output: output as Record<string, unknown> })
                  }
                  onSave={() =>
                    !alreadySaved && saveComponent(part.toolCallId, toolName, part.output)
                  }
                  alreadySaved={alreadySaved}
                />
              )
            }

            return (
              <div key={part.toolCallId} className="relative group">
                <ReplayProvider isReplay={isReplay}>
                  <Component {...(output as Record<string, unknown>)} />
                </ReplayProvider>
                {expandable || saveable ? (
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {expandable ? (
                      <Button
                        size="sm"
                        variant="outline"
                        isIconOnly
                        aria-label="Expand"
                        onPress={() =>
                          setExpanded({ name: toolName, output: output as Record<string, unknown> })
                        }
                        className="clay-btn h-7 w-7"
                      >
                        <Maximize2 size={13} aria-hidden="true" />
                      </Button>
                    ) : null}
                    {saveable ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() =>
                          !alreadySaved && saveComponent(part.toolCallId, toolName, part.output)
                        }
                        className="clay-btn"
                        isDisabled={alreadySaved}
                      >
                        {alreadySaved ? 'Saved' : 'Save'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          }

          return null
        })}
      </div>

      <Modal
        isOpen={expanded !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setExpanded(null)
        }}
      >
        <ModalBackdrop>
          <ModalContainer size="cover" scroll="inside">
            <ModalDialog>
              <ModalHeader>
                <ModalHeading>
                  {expanded?.output && 'title' in expanded.output
                    ? String(expanded.output.title)
                    : (expanded?.name.replace(/_/g, ' ') ?? '')}
                </ModalHeading>
                <ModalCloseTrigger />
              </ModalHeader>
              <ModalBody>
                {ExpandedComponent && expanded ? (
                  <ReplayProvider isReplay={false}>
                    <ExpandedComponent {...expanded.output} />
                  </ReplayProvider>
                ) : null}
              </ModalBody>
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    </>
  )
}
