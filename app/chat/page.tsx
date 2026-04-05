'use client'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { SessionSidebar } from '@/components/chat/session-sidebar'
import { GenerativeMessage } from '@/components/generative/generative-message'
import { VoiceModeButton } from '@/components/chat/voice-mode-button'
import { AppNav } from '@/components/app-nav'
import { Button } from '@heroui/react'
import { Send } from 'lucide-react'

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionListKey, setSessionListKey] = useState(0)
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

  const { messages, sendMessage, status, setMessages } = useChat({ transport })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Pre-fill input from suggestion card chat_seed
  useEffect(() => {
    const seed = sessionStorage.getItem('vela_chat_seed')
    if (seed) {
      sessionStorage.removeItem('vela_chat_seed')
      setInput(seed)
    }
  }, [])

  const selectSession = useCallback(async (id: string) => {
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
  }, [setMessages])

  const newSession = useCallback(() => {
    selectAbortRef.current?.abort()
    setSessionId(null)
    sessionIdRef.current = null
    setMessages([])
  }, [setMessages])

  const deleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete session', err)
    }
    if (sessionIdRef.current === id) {
      newSession()
    }
    setSessionListKey(k => k + 1) // force sidebar to refetch
  }, [newSession])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')

    // Create session eagerly before the first message so the server can persist all messages
    if (!sessionIdRef.current && !sessionCreatingRef.current) {
      sessionCreatingRef.current = true
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.slice(0, 60) }),
        })
        if (res.ok) {
          const session = await res.json()
          if (session?.id) {
            sessionIdRef.current = session.id  // sync update so transport picks it up
            setSessionId(session.id)
          }
        }
      } catch (err) {
        console.error('Failed to create chat session', err)
      } finally {
        sessionCreatingRef.current = false
      }
    }

    sendMessage({ text })
  }, [input, isLoading, sendMessage])

  const handleVoiceTranscript = useCallback((text: string) => {
    if (!text.trim() || isLoading) return
    sendMessage({ text })
  }, [isLoading, sendMessage])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex h-screen">
      <AppNav />
      <SessionSidebar
        activeSessionId={sessionId}
        refreshKey={sessionListKey}
        onSelectSession={selectSession}
        onNewSession={newSession}
        onDeleteSession={deleteSession}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <p className="text-2xl font-bold text-primary mb-2">Hi, I&apos;m Vela</p>
                <p className="text-default-500 text-sm">Ask me anything about your finances, upload a document, or try a simulation.</p>
              </div>
            </div>
          )}
          {messages.map((m) => (
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
              aria-label="Message to Vela"
              placeholder="Ask Vela anything..."
              rows={2}
              className="flex-1 clay-input resize-none rounded-xl border border-divider p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <VoiceModeButton onTranscript={handleVoiceTranscript} />
            <Button
              type="submit"
              variant="primary"
              isDisabled={isLoading}
              isIconOnly
              aria-label="Send message"
              className="clay-btn h-10 w-10"
            >
              <Send size={16} aria-hidden="true" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
