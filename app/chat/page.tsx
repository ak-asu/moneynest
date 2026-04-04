'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { SessionSidebar } from '@/components/chat/session-sidebar'
import { GenerativeMessage } from '@/components/generative/generative-message'
import { Button } from '@heroui/react'
import { Send } from 'lucide-react'
import type { UIMessage } from 'ai'

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const sessionIdRef = useRef<string | null>(null)
  const sessionCreatingRef = useRef(false)
  const selectAbortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Keep ref in sync so the transport body closure always reads the latest sessionId
  sessionIdRef.current = sessionId

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ sessionId: sessionIdRef.current }),
      }),
    [],
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onFinish: async ({ messages: finishedMessages }) => {
      if (!sessionIdRef.current && !sessionCreatingRef.current) {
        sessionCreatingRef.current = true
        const firstUserMsg = finishedMessages.find((m: UIMessage) => m.role === 'user')
        const firstPart = firstUserMsg?.parts?.[0]
        const title =
          (firstPart && 'text' in firstPart ? (firstPart as { text: string }).text.slice(0, 60) : null) ||
          'New conversation'
        try {
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
          })
          if (!res.ok) throw new Error(`Session create failed: ${res.status}`)
          const session = await res.json()
          if (session?.id) setSessionId(session.id)
        } catch (err) {
          console.error('Failed to create chat session', err)
        } finally {
          sessionCreatingRef.current = false
        }
      }
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function selectSession(id: string) {
    // Cancel any in-flight fetch
    selectAbortRef.current?.abort()
    selectAbortRef.current = new AbortController()

    setSessionId(id)
    setMessages([])
    try {
      const res = await fetch(`/api/sessions/${id}/messages`, {
        signal: selectAbortRef.current.signal,
      })
      if (!res.ok) return
      const msgs = await res.json()
      setMessages(msgs)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return // cancelled — ignore
      console.error('Failed to load session messages', e)
    }
  }

  function newSession() {
    setSessionId(null)
    setMessages([])
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInput('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <SessionSidebar
        activeSessionId={sessionId}
        onSelectSession={selectSession}
        onNewSession={newSession}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <p className="text-2xl font-bold text-primary mb-2">Hi, I&apos;m Vela</p>
                <p className="text-default-500 text-sm">Ask me anything about your finances, upload a document, or try a simulation.</p>
              </div>
            </div>
          )}
          {messages.map((m: UIMessage) => (
            <GenerativeMessage key={m.id} message={m} sessionId={sessionId || ''} />
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-divider p-4">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask Vela anything..."
              rows={2}
              className="flex-1 clay-input resize-none rounded-xl border border-divider p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              type="submit"
              variant="primary"
              isDisabled={isLoading}
              isIconOnly
              className="clay-btn h-10 w-10"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
