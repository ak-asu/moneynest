'use client'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { AppNav } from '@/components/app-nav'
import {
  Button,
  Chip,
  Modal,
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
  ModalBody,
  ModalCloseTrigger,
} from '@heroui/react'
import { ExternalLink, Search, Gamepad2 } from 'lucide-react'
import { COMPONENT_REGISTRY } from '@/components/generative/component-registry'
import { GAME_CATALOG } from '@/lib/games/catalog'
import type { CatalogGame } from '@/lib/games/catalog'
import type { DbSavedItem, SavedItemType } from '@/types/database'
import { useI18n } from '@/components/i18n-provider'

// Minimal shape the modal needs — satisfied by both DbSavedItem and catalog entries
interface DialogItem {
  id: string
  title: string
  type: SavedItemType
  component_name: string
  component_props: Record<string, unknown>
  created_at: string | null
}

const TYPE_LABEL_KEYS: Record<SavedItemType, string> = {
  simulation: 'library.type.simulation',
  game: 'library.type.game',
  learning: 'library.type.learning',
  plan: 'library.type.plan',
  document: 'library.type.document',
  audio: 'library.type.audio',
}

const TYPE_CHIP_COLOR: Record<
  SavedItemType,
  'default' | 'accent' | 'success' | 'warning' | 'danger'
> = {
  simulation: 'accent',
  game: 'default',
  learning: 'success',
  plan: 'warning',
  document: 'default',
  audio: 'danger',
}

const GAME_TYPE_LABEL_KEYS: Record<string, string> = {
  allocation_puzzle: 'library.gameType.allocation_puzzle',
  time_pressure: 'library.gameType.time_pressure',
  tradeoff_slider: 'library.gameType.tradeoff_slider',
  drag_drop: 'library.gameType.drag_drop',
  insurance_card_game: 'library.gameType.insurance_card_game',
  credit_quest_game: 'library.gameType.credit_quest_game',
  term_match: 'library.gameType.term_match',
  fin_word: 'library.gameType.fin_word',
  wealth_farm: 'library.gameType.wealth_farm',
}

const FILTER_OPTIONS: Array<{ value: SavedItemType | 'all'; labelKey: string }> = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'game', labelKey: 'library.type.game' },
  { value: 'simulation', labelKey: 'library.type.simulation' },
  { value: 'learning', labelKey: 'library.type.learning' },
  { value: 'plan', labelKey: 'library.type.plan' },
  { value: 'document', labelKey: 'library.type.document' },
  { value: 'audio', labelKey: 'library.type.audio' },
]

const MINI_GAME_PREVIEW_PLACEHOLDER = '/assets/mini-game-placeholder.svg'

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

function formatDate(iso: string, intlLocale: string, unknownLabel: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return unknownLabel
  return new Intl.DateTimeFormat(intlLocale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

function CatalogGameCard({
  game,
  onOpen,
}: {
  game: CatalogGame
  onOpen: (item: DialogItem) => void
}) {
  const { t } = useI18n()
  const gameTypeLabelKey = GAME_TYPE_LABEL_KEYS[game.game_type]

  return (
    <div className="clay-card group relative flex h-full overflow-hidden flex-col gap-3 p-5 transition-all duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden rounded-2xl border border-default-200 bg-default-100/60">
        <Image
          src={MINI_GAME_PREVIEW_PLACEHOLDER}
          alt={`${game.title} preview`}
          width={960}
          height={540}
          className="aspect-video w-full object-cover"
          unoptimized
        />
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug flex-1 min-w-0 truncate">{game.title}</h3>
        <Chip size="sm" color="default" variant="soft" className="shrink-0 text-xs">
          {gameTypeLabelKey ? t(gameTypeLabelKey) : game.game_type}
        </Chip>
      </div>
      <p className="text-xs text-default-400 line-clamp-3 flex-1">{game.instructions}</p>
      <Button
        size="sm"
        variant="primary"
        onPress={() => onOpen(catalogToDialogItem(game))}
        className="clay-btn group/play mt-auto w-full gap-2 border border-primary/25 bg-primary/10 text-primary-700 transition-all duration-300 hover:-translate-y-0.5"
      >
        <Gamepad2
          size={13}
          aria-hidden="true"
          className="transition-transform duration-300 group-hover/play:[animation:controller-wiggle_300ms_ease-in-out_infinite]"
        />
        {t('library.play')}
      </Button>
    </div>
  )
}

function LibraryCard({ item, onOpen }: { item: DbSavedItem; onOpen: (item: DialogItem) => void }) {
  const { t, intlLocale } = useI18n()

  return (
    <div className="clay-card group relative flex h-full overflow-hidden flex-col gap-3 p-5 transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug flex-1 min-w-0 truncate">{item.title}</h3>
        <Chip
          size="sm"
          color={TYPE_CHIP_COLOR[item.type]}
          variant="soft"
          className="shrink-0 text-xs capitalize"
        >
          {t(TYPE_LABEL_KEYS[item.type])}
        </Chip>
      </div>
      <p className="text-xs text-default-400 flex-1">
        {t('library.savedOn', {
          date: formatDate(item.created_at, intlLocale, t('common.unknownDate')),
        })}
      </p>
      <Button
        size="sm"
        variant="ghost"
        onPress={() => onOpen(item as unknown as DialogItem)}
        className="clay-btn group/play mt-auto w-full gap-2 border border-primary/25 bg-primary/10 text-primary-700 transition-all duration-300 hover:-translate-y-0.5"
      >
        {t('library.open')}
        <ExternalLink size={13} aria-hidden="true" />
      </Button>
    </div>
  )
}

export default function LibraryPage() {
  const { t, intlLocale } = useI18n()
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
        setFetchError(t('library.fetchFailed', { status: res.status }))
        return
      }
      const data: DbSavedItem[] = await res.json()
      setItems(data)
    } catch {
      setFetchError(t('library.networkFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const q = query.toLowerCase()

  const showCatalog = activeFilter === 'all' || activeFilter === 'game'
  const visibleCatalog = showCatalog
    ? GAME_CATALOG.filter((g) => !q || g.title.toLowerCase().includes(q))
    : []

  const visibleItems = items.filter((item) => {
    if (activeFilter !== 'all' && item.type !== activeFilter) return false
    if (q && !item.title.toLowerCase().includes(q)) return false
    return true
  })

  const DialogComponent = dialogItem ? COMPONENT_REGISTRY[dialogItem.component_name] : null

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main aria-label="Saved library" className="flex-1 overflow-y-auto">
        <style jsx>{`
          @keyframes controller-wiggle {
            0%,
            100% {
              transform: rotate(0deg) scale(1);
            }
            25% {
              transform: rotate(-10deg) scale(1.05);
            }
            50% {
              transform: rotate(10deg) scale(1.08);
            }
            75% {
              transform: rotate(-6deg) scale(1.03);
            }
          }
        `}</style>
        <div className="max-w-7xl space-y-6 p-6">
          {/* Header + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{t('library.title')}</h1>
              <p className="text-default-500 text-sm mt-1">{t('library.subtitle')}</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400 pointer-events-none"
              />
              <input
                type="search"
                placeholder={t('common.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="clay-input w-full pl-9 pr-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          {/* Chip filters */}
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={activeFilter === opt.value ? 'primary' : 'ghost'}
                onPress={() => setActiveFilter(opt.value)}
                className="clay-btn rounded-full"
              >
                {t(opt.labelKey)}
              </Button>
            ))}
          </div>

          {/* Catalog games */}
          {visibleCatalog.length > 0 && (
            <section aria-label="Mini-games">
              <h2 className="font-bold text-sm mb-3">{t('library.miniGames')}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                {visibleCatalog.map((game) => (
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
              <h2 className="font-bold text-sm mb-3">{t('library.savedItems')}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                {visibleItems.map((item) => (
                  <LibraryCard key={item.id} item={item} onOpen={setDialogItem} />
                ))}
              </div>
            </section>
          ) : visibleCatalog.length === 0 ? (
            <div className="clay-card p-8 text-center">
              <p className="font-semibold text-default-600">
                {query ? t('library.noResults') : t('library.empty')}
              </p>
              <p className="text-default-400 text-sm mt-1">
                {query ? t('library.noResultsHint') : t('library.emptyHint')}
              </p>
            </div>
          ) : null}
        </div>
      </main>

      <Modal
        isOpen={dialogItem !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDialogItem(null)
        }}
      >
        <ModalBackdrop>
          <ModalContainer size="cover" scroll="inside">
            <ModalDialog>
              <ModalHeader>
                <ModalHeading>{dialogItem?.title ?? ''}</ModalHeading>
                {dialogItem && (
                  <p className="text-xs text-default-400 mt-0.5">
                    {t(TYPE_LABEL_KEYS[dialogItem.type])}
                    {dialogItem.created_at
                      ? ` · ${t('library.savedOn', {
                          date: formatDate(
                            dialogItem.created_at,
                            intlLocale,
                            t('common.unknownDate')
                          ),
                        })}`
                      : ''}
                  </p>
                )}
                <ModalCloseTrigger />
              </ModalHeader>
              <ModalBody>
                {DialogComponent && dialogItem ? (
                  <DialogComponent {...dialogItem.component_props} />
                ) : (
                  <p className="text-sm text-default-400">{t('library.unavailablePreview')}</p>
                )}
              </ModalBody>
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    </div>
  )
}
