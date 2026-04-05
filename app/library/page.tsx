'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppNav } from '@/components/app-nav'
import { Button, Chip, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalHeader, ModalHeading, ModalBody, ModalCloseTrigger } from '@heroui/react'
import { ExternalLink } from 'lucide-react'
import { COMPONENT_REGISTRY } from '@/components/generative/component-registry'
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

function LibraryCard({ item, onOpen }: { item: DbSavedItem; onOpen: (item: DbSavedItem) => void }) {
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
        onPress={() => onOpen(item)}
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
  const [dialogItem, setDialogItem] = useState<DbSavedItem | null>(null)

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

  const DialogComponent = dialogItem ? COMPONENT_REGISTRY[dialogItem.component_name] : null

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
                <LibraryCard key={item.id} item={item} onOpen={setDialogItem} />
              ))}
            </div>
          )}
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
                    {TYPE_LABELS[dialogItem.type]} · Saved {formatDate(dialogItem.created_at)}
                  </p>
                )}
                <ModalCloseTrigger />
              </ModalHeader>
              <ModalBody>
                {DialogComponent && dialogItem ? (
                  <DialogComponent {...(dialogItem.component_props as Record<string, unknown>)} />
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
