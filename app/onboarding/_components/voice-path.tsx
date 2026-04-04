'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import { Mic, MicOff } from 'lucide-react'
import { useConversation } from '@11labs/react'

interface VoicePathProps {
  onComplete: () => void
}

export function VoicePath({ onComplete }: VoicePathProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'done'>('idle')
  const [transcript, setTranscript] = useState<string[]>([])

  const conversation = useConversation({
    onMessage: (props: { message: string; source: 'user' | 'ai' }) => {
      setTranscript(prev => [...prev, `${props.source === 'ai' ? 'Vela' : 'You'}: ${props.message}`])
    },
    onDisconnect: () => {
      setStatus('done')
    },
  })

  async function start() {
    setStatus('connecting')
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const res = await fetch('/api/elevenlabs/agent')
      const { signedUrl } = await res.json() as { signedUrl: string }
      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            firstMessage: "Hi! I'm Vela. I'm going to ask you a few quick questions to understand your financial situation. This will take about 2 minutes. What's your approximate monthly income?",
          }
        }
      })
      setStatus('active')
    } catch {
      setStatus('idle')
    }
  }

  async function stop() {
    await conversation.endSession()
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <span className="text-5xl">✅</span>
        <p className="font-bold text-lg">Profile set up!</p>
        <p className="text-default-500 text-sm text-center">Vela has your details. Let&apos;s get started.</p>
        <Button variant="primary" className="clay-btn" onPress={onComplete}>Go to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center clay-card ${status === 'active' ? 'animate-pulse bg-primary-100' : ''}`}>
        {status === 'active' ? <Mic size={32} className="text-primary" /> : <Mic size={32} className="text-default-400" />}
      </div>
      {status === 'idle' && (
        <>
          <p className="text-sm text-default-600 text-center max-w-xs">
            Talk to Vela for 2 minutes. She&apos;ll ask about your income, expenses, and goals — no typing needed.
          </p>
          <Button variant="primary" size="lg" className="clay-btn" onPress={start}>
            Start voice setup
          </Button>
        </>
      )}
      {status === 'connecting' && <p className="text-sm text-default-500">Connecting...</p>}
      {status === 'active' && (
        <>
          <div className="w-full max-w-sm bg-default-50 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2">
            {transcript.map((line, i) => (
              <p key={i} className="text-sm">{line}</p>
            ))}
          </div>
          <Button variant="outline" className="clay-btn" onPress={stop}>
            <MicOff size={16} />
            Done
          </Button>
        </>
      )}
    </div>
  )
}
