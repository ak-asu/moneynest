'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppNav } from '@/components/app-nav'
import {
  Button, Chip,
  Modal, ModalBackdrop, ModalContainer, ModalDialog,
  ModalHeader, ModalHeading, ModalBody, ModalCloseTrigger,
} from '@heroui/react'
import { ExternalLink, Search, Gamepad2 } from 'lucide-react'
import { COMPONENT_REGISTRY } from '@/components/generative/component-registry'
import { GAME_CATALOG } from '@/lib/games/catalog'
import type { CatalogGame } from '@/lib/games/catalog'
import type { DbSavedItem, SavedItemType } from '@/types/database'

// Minimal shape the modal needs — satisfied by both DbSavedItem and catalog entries
interface DialogItem {
  id: string
  title: string
  type: SavedItemType
  component_name: string
  component_props: Record<string, unknown>
  created_at: string | null
}

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

const FILTER_OPTIONS: Array<{ value: SavedItemType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'game', label: 'Game' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'learning', label: 'Learning' },
  { value: 'plan', label: 'Plan' },
  { value: 'document', label: 'Document' },
  { value: 'audio', label: 'Audio' },
]

function catalogToDialogItem(game: CatalogGame): DialogItem {
  return {
    id: game.id,
    title: game.title,
    type: 'game',
    component_name: 'mini_game',
    component_props: {
      game_type: game.game_type,
      title: game.title,
      instructions: game.instructions,
      income: game.income,
      categories: game.categories,
      win_condition: game.win_condition,
      ...(game.time_limit_seconds != null ? { time_limit_seconds: game.time_limit_seconds } : {}),
    },
    created_at: null,
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

function CatalogGameCard({ game, onOpen }: { game: CatalogGame; onOpen: (item: DialogItem) => void }) {
  return (
    <div className="clay-card p-5 flex flex-col gap-3 rounded-2xl bg-default-50">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug flex-1 min-w-0 truncate">{game.title}</h3>
        <Chip size="sm" color="default" variant="soft" className="shrink-0 text-xs">
          {GAME_TYPE_LABELS[game.game_type] ?? game.game_type}
        </Chip>
      </div>
      <p className="text-xs text-default-400 line-clamp-2">{game.instructions}</p>
      <Button
        size="sm"
        variant="primary"
        onPress={() => onOpen(catalogToDialogItem(game))}
        className="clay-btn w-full gap-1"
      >
        <Gamepad2 size={13} aria-hidden="true" />
        Play
      </Button>
    </div>
  )
}

function LibraryCard({ item, onOpen }: { item: DbSavedItem; onOpen: (item: DialogItem) => void }) {
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
        onPress={() => onOpen(item as unknown as DialogItem)}
        className="clay-btn w-full gap-1"
      >
        Open
        <ExternalLink size={13} aria-hidden="true" />
      </Button>
    </div>
  )
}

export default function LibraryPage() {
  const [items, setItems] = useState<DbSavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [dialogItem, setDialogItem] = useState<DialogItem | null>(null)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<SavedItemType | 'all'>('all')

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

  const q = query.toLowerCase()

  const showCatalog = activeFilter === 'all' || activeFilter === 'game'
  const visibleCatalog = showCatalog
    ? GAME_CATALOG.filter(g => !q || g.title.toLowerCase().includes(q))
    : []

  const visibleItems = items.filter(item => {
    if (activeFilter !== 'all' && item.type !== activeFilter) return false
    if (q && !item.title.toLowerCase().includes(q)) return false
    return true
  })

  const DialogComponent = dialogItem ? COMPONENT_REGISTRY[dialogItem.component_name] : null

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main aria-label="Saved library" className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-5xl">

          {/* Header + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Library</h1>
              <p className="text-default-500 text-sm mt-1">Pre-built games and your saved content from Vela.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="clay-input w-full rounded-xl border border-default-200 bg-default-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>
          </div>

          {/* Chip filters */}
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                size="sm"
                variant={activeFilter === opt.value ? 'primary' : 'ghost'}
                onPress={() => setActiveFilter(opt.value)}
                className="rounded-full clay-btn"
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Catalog games */}
          {visibleCatalog.length > 0 && (
            <section aria-label="Mini-games">
              <h2 className="font-bold text-sm mb-3">Mini-Games</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {visibleCatalog.map(game => (
                  <CatalogGameCard key={game.id} game={game} onOpen={setDialogItem} />
                ))}
              </div>
            </section>
          )}

          {/* Saved items */}
          {loading ? (
            <p className="text-default-400 text-sm">Loading…</p>
          ) : fetchError ? (
            <p className="text-danger text-sm">{fetchError}</p>
          ) : visibleItems.length > 0 ? (
            <section aria-label="Saved items">
              <h2 className="font-bold text-sm mb-3">Saved</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleItems.map(item => (
                  <LibraryCard key={item.id} item={item} onOpen={setDialogItem} />
                ))}
              </div>
            </section>
          ) : visibleCatalog.length === 0 ? (
            <div className="clay-card p-8 text-center">
              <p className="font-semibold text-default-600">
                {query ? 'No results' : 'Your library is empty'}
              </p>
              <p className="text-default-400 text-sm mt-1">
                {query
                  ? 'Try a different search term or clear the filter.'
                  : 'Save simulations, plans, and learning cards from chat to see them here.'}
              </p>
            </div>
          ) : null}

        </div>
      </main>

      <Modal
        isOpen={dialogItem !== null}
        onOpenChange={(open: boolean) => { if (!open) setDialogItem(null) }}
      >
        <ModalBackdrop>
          <ModalContainer size="cover" scroll="inside">
            <ModalDialog>
              <ModalHeader>
                <ModalHeading>{dialogItem?.title ?? ''}</ModalHeading>
                {dialogItem && (
                  <p className="text-xs text-default-400 mt-0.5">
                    {TYPE_LABELS[dialogItem.type]}
                    {dialogItem.created_at ? ` · Saved ${formatDate(dialogItem.created_at)}` : ''}
                  </p>
                )}
                <ModalCloseTrigger />
              </ModalHeader>
              <ModalBody>
                {DialogComponent && dialogItem ? (
                  <DialogComponent {...dialogItem.component_props} />
                ) : (
                  <p className="text-sm text-default-400">This component cannot be previewed.</p>
                )}
              </ModalBody>
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    </div>
  )
}
