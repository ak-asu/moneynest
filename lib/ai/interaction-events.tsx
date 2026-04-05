'use client'
import { createContext, useContext, type ReactNode } from 'react'

export type InteractionEvent = {
  componentName: string
  status: 'completed' | 'skipped' | 'abandoned'
  summary: string
  autoSend?: boolean
  prompt?: string
}

type Dispatch = (event: InteractionEvent) => void

const InteractionEventContext = createContext<Dispatch>(() => {})

export function InteractionEventProvider({
  onEvent,
  children,
}: {
  onEvent: Dispatch
  children: ReactNode
}) {
  return (
    <InteractionEventContext.Provider value={onEvent}>{children}</InteractionEventContext.Provider>
  )
}

export function useInteractionEvent(): Dispatch {
  return useContext(InteractionEventContext)
}

/** Formats an event into the [Vela-System: …] prefix string */
export function formatSystemEvent(event: InteractionEvent): string {
  return `[Vela-System: User ${event.status} ${event.componentName} — ${event.summary}]`
}
