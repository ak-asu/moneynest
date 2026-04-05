'use client'
import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { Plus, MessageCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { DbChatSession } from '@/types/database'

interface SessionSidebarProps {
  activeSessionId: string | null
  refreshKey: number
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
}

export function SessionSidebar({ activeSessionId, refreshKey, onSelectSession, onNewSession, onDeleteSession }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<DbChatSession[]>([])

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(setSessions)
  }, [activeSessionId, refreshKey])

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
          <div
            key={s.id}
            className={cn(
              'group w-full flex items-center gap-1 rounded-xl transition-colors',
              activeSessionId === s.id
                ? 'bg-primary-100 text-primary'
                : 'text-default-600 hover:bg-default-100'
            )}
          >
            <button
              onClick={() => onSelectSession(s.id)}
              className={cn(
                'flex-1 text-left px-3 py-2 text-sm flex items-center gap-2 min-w-0',
                activeSessionId === s.id ? 'font-medium' : ''
              )}
            >
              <MessageCircle size={14} className="shrink-0" />
              <span className="truncate">{s.title}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteSession(s.id)
              }}
              aria-label={`Delete "${s.title}"`}
              className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded-lg hover:bg-danger-100 hover:text-danger transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
