'use client'
import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { Plus, MessageCircle, Trash2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { DbChatSession } from '@/types/database'

const SIDEBAR_COLLAPSED_KEY = 'vela_chat_sidebar_collapsed'

interface SessionSidebarProps {
  activeSessionId: string | null
  refreshKey: number
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
}

export function SessionSidebar({
  activeSessionId,
  refreshKey,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<DbChatSession[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === '1') setCollapsed(true)
    } catch {
      // Ignore storage errors; sidebar still works with default state.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // Ignore storage errors; this only affects preference persistence.
    }
  }, [collapsed])

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then(setSessions)
  }, [activeSessionId, refreshKey])

  return (
    <aside
      className={cn(
        'border-l border-divider flex flex-col h-full shrink-0 transition-[width] duration-200 ease-out overflow-hidden',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      <div
        className={cn(
          'p-3 border-b border-divider flex items-center gap-2',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <Button onPress={onNewSession} size="sm" variant="primary" fullWidth className="clay-btn">
            <Plus size={14} />
            New chat
          </Button>
        )}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((prev) => !prev)}
          className="h-8 w-8 shrink-0 rounded-lg border border-divider text-default-600 hover:bg-default-100 transition-colors grid place-items-center"
        >
          {collapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        </button>
      </div>
      {collapsed && (
        <div className="px-2 pt-2">
          <button
            type="button"
            title="New chat"
            onClick={onNewSession}
            className="w-full h-8 rounded-lg border border-divider text-default-600 hover:bg-primary-100 hover:text-primary transition-colors grid place-items-center"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.map((s) => (
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
              title={collapsed ? s.title : undefined}
              className={cn(
                'text-left py-2 text-sm flex items-center gap-2 min-w-0',
                collapsed ? 'flex-1 justify-center px-2' : 'flex-1 px-3',
                activeSessionId === s.id ? 'font-medium' : ''
              )}
            >
              <MessageCircle size={14} className="shrink-0" />
              {!collapsed && <span className="truncate">{s.title}</span>}
            </button>
            {!collapsed && (
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
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
