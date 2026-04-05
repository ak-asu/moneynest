'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import { Mic, MicOff } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'

interface VoiceModeButtonProps {
  onTranscript: (text: string) => void
}

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike

interface BrowserSpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike
}

export function VoiceModeButton({ onTranscript }: VoiceModeButtonProps) {
  const { t, intlLocale } = useI18n()
  const [active, setActive] = useState(false)
  const [pending, setPending] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const speechWindow = window as BrowserSpeechWindow
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setSupported(false)
      return
    }

    setSupported(true)
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = intlLocale
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const alternative = result[0]
        if (!alternative?.transcript) continue
        if (result.isFinal) {
          finalTranscriptRef.current =
            `${finalTranscriptRef.current} ${alternative.transcript}`.trim()
        }
      }
    }

    recognition.onerror = (event: Event) => {
      console.error('Speech recognition error:', event)
      setActive(false)
      setPending(false)
    }

    recognition.onend = () => {
      setActive(false)
      setPending(false)
      const transcript = finalTranscriptRef.current.trim()
      if (transcript) {
        onTranscript(transcript)
        finalTranscriptRef.current = ''
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.abort()
      recognitionRef.current = null
    }
  }, [intlLocale, onTranscript])

  async function startVoice() {
    if (!supported || !recognitionRef.current || active) return
    setPending(true)
    finalTranscriptRef.current = ''
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      recognitionRef.current.start()
      setActive(true)
    } catch (err) {
      console.error('Failed to start voice:', err)
      setActive(false)
      setPending(false)
    } finally {
      if (!active) setPending(false)
    }
  }

  async function stopVoice() {
    if (!recognitionRef.current || !active) return
    setPending(true)
    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.error('Failed to stop speech recognition:', err)
      setActive(false)
      setPending(false)
    }
  }

  return (
    <Button
      isIconOnly
      variant={active ? 'danger' : 'ghost'}
      isDisabled={pending || !supported}
      onPress={active ? stopVoice : startVoice}
      className="clay-btn"
      aria-label={
        supported
          ? active
            ? t('chat.voiceEndAria')
            : t('chat.voiceStartAria')
          : 'Speech recognition is not supported in this browser'
      }
    >
      {active ? <MicOff size={16} /> : <Mic size={16} />}
    </Button>
  )
}
