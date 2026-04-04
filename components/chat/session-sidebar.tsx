'use client'
import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { Plus, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { DbChatSession } from '@/types/database'

interface SessionSidebarProps {
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
}

export function SessionSidebar({ activeSessionId, onSelectSession, onNewSession }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<DbChatSession[]>([])

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(setSessions)
  }, [activeSessionId])

  return (
    <aside className="w-56 border-r border-divider flex flex-col h-full">
      <div className="p-3 border-b border-divider">
        <Button
          onPress={onNewSession}
          size="sm"
          variant="primary"
          fullWidth
          className="clay-btn"
        >
          <Plus size={14} />
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors',
              activeSessionId === s.id
                ? 'bg-primary-100 text-primary font-medium'
                : 'text-default-600 hover:bg-default-100'
            )}
          >
            <MessageCircle size={14} className="shrink-0" />
            <span className="truncate">{s.title}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
