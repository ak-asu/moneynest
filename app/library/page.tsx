'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { Button, Chip } from '@heroui/react'
import { ArrowRight } from 'lucide-react'
import type { DbSavedItem, SavedItemType } from '@/types/database'

const TYPE_LABELS: Record<SavedItemType, string> = {
  simulation: 'Simulation',
  game: 'Game',
  learning: 'Learning',
  plan: 'Plan',
  document: 'Document',
  audio: 'Audio',
}

const TYPE_CHIP_COLOR: Record<SavedItemType, 'default' | 'accent' | 'success' | 'warning' | 'danger'> = {
  simulation: 'accent',
  game: 'default',
  learning: 'success',
  plan: 'warning',
  document: 'default',
  audio: 'danger',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

function LibraryCard({ item }: { item: DbSavedItem }) {
  const router = useRouter()

  function handleReopen() {
    sessionStorage.setItem('vela_chat_seed', `Show me the ${item.title} again`)
    router.push('/chat')
  }

  return (
    <div className="clay-card p-5 flex flex-col gap-3 rounded-2xl bg-default-50">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug flex-1 min-w-0 truncate">{item.title}</h3>
        <Chip
          size="sm"
          color={TYPE_CHIP_COLOR[item.type]}
          variant="soft"
          className="shrink-0 text-xs capitalize"
        >
          {TYPE_LABELS[item.type]}
        </Chip>
      </div>

      <p className="text-xs text-default-400">Saved {formatDate(item.created_at)}</p>

      <Button
        size="sm"
        variant="ghost"
        onPress={handleReopen}
        className="clay-btn w-full gap-1"
      >
        Re-open in chat
        <ArrowRight size={13} aria-hidden="true" />
      </Button>
    </div>
  )
}

export default function LibraryPage() {
  const [items, setItems] = useState<DbSavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/library')
      if (!res.ok) {
        setFetchError(`Failed to load library (${res.status}). Please try again.`)
        return
      }
      const data: DbSavedItem[] = await res.json()
      setItems(data)
    } catch {
      setFetchError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main aria-label="Saved library" className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-5xl">
          <div>
            <h1 className="text-2xl font-bold">Saved Library</h1>
            <p className="text-default-500 text-sm mt-1">Components and content you&apos;ve saved from Vela.</p>
          </div>

          {loading ? (
            <p className="text-default-400 text-sm">Loading…</p>
          ) : fetchError ? (
            <p className="text-danger text-sm">{fetchError}</p>
          ) : items.length === 0 ? (
            <div className="clay-card p-8 text-center">
              <p className="font-semibold text-default-600">Your library is empty</p>
              <p className="text-default-400 text-sm mt-1">Save simulations, plans, and learning cards from chat to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <LibraryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
