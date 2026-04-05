'use client'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { AppNav } from '@/components/app-nav'
import { UploadZone } from './_components/upload-zone'
import { DocumentCard } from './_components/document-card'
import type { DbDocument, DbProfile, DocumentKind } from '@/types/database'
import { Search, FileText } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'

const ALL_FILTER_TYPES: Array<DocumentKind | 'all'> = [
  'all',
  'insurance',
  'lease',
  'bill',
  'payslip',
  'other',
]

export default function DocumentsPage() {
  const { t } = useI18n()
  const [docs, setDocs] = useState<DbDocument[]>([])
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DocumentKind | 'all'>('all')

  const fetchDocs = useCallback(async (): Promise<DbDocument[]> => {
    try {
      const res = await fetch('/api/documents')
      if (!res.ok) return []
      return (await res.json()) as DbDocument[]
    } catch {
      return []
    }
  }, [])

  const loadDocs = useCallback(async () => {
    setDocs(await fetchDocs())
  }, [fetchDocs])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchDocs(),
      fetch('/api/profile')
        .then((r) => (r.ok ? (r.json() as Promise<DbProfile>) : null))
        .catch(() => null),
    ]).then(([initialDocs, prof]) => {
      if (!cancelled) {
        setDocs(initialDocs)
        setProfile(prof)
      }
    })

    return () => {
      cancelled = true
    }
  }, [fetchDocs])

  const filtered = useMemo(() => {
    return docs.filter((doc) => {
      const matchType = filter === 'all' || doc.document_type === filter
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        doc.filename.toLowerCase().includes(q) ||
        doc.ai_explanation?.plain_summaries.some((s) => s.toLowerCase().includes(q))
      return matchType && matchSearch
    })
  }, [docs, search, filter])

  const counts = useMemo(() => {
    const map: Partial<Record<DocumentKind | 'all', number>> = { all: docs.length }
    for (const doc of docs) {
      map[doc.document_type] = (map[doc.document_type] ?? 0) + 1
    }
    return map
  }, [docs])

  const visibleTypes = useMemo(
    () => ALL_FILTER_TYPES.filter((t) => t === 'all' || (counts[t] ?? 0) > 0),
    [counts]
  )

  const docTypeLabels: Record<DocumentKind | 'all', string> = {
    all: t('documents.type.all'),
    insurance: t('documents.type.insurance'),
    lease: t('documents.type.lease'),
    bill: t('documents.type.bill'),
    payslip: t('documents.type.payslip'),
    other: t('documents.type.other'),
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">{t('documents.title')}</h1>
            <p className="text-sm text-default-400 mt-1">
              {docs.length === 0
                ? t('documents.subtitleEmpty')
                : t('documents.subtitleCount', { count: docs.length })}
            </p>
          </div>

          {/* Upload Zone */}
          <UploadZone onUploaded={loadDocs} />

          {/* Search + Filters */}
          {docs.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-default-400 pointer-events-none"
                />
                <input
                  type="search"
                  placeholder={t('documents.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full clay-input pl-9 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-default-400"
                />
              </div>

              {visibleTypes.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {visibleTypes.map((t) => {
                    const count = counts[t] ?? 0
                    const active = filter === t
                    return (
                      <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                          active
                            ? 'clay-btn bg-primary/10 text-primary-700 border-primary/25'
                            : 'clay-btn text-default-600 border-default-200 hover:border-primary/40 hover:text-default-800'
                        }`}
                      >
                        {docTypeLabels[t]}
                        {count > 0 && (
                          <span className={`ml-1 ${active ? 'opacity-80' : 'opacity-50'}`}>
                            ({count})
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Documents list */}
          <div className="flex flex-col gap-3">
            {filtered.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} profile={profile} />
            ))}

            {filtered.length === 0 && docs.length > 0 && (
              <div className="clay-card p-10 flex flex-col items-center gap-3 text-center">
                <Search size={22} className="text-default-300" />
                <p className="text-default-400 text-sm">{t('documents.noMatch')}</p>
                <button
                  onClick={() => {
                    setSearch('')
                    setFilter('all')
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {t('common.clearFilters')}
                </button>
              </div>
            )}

            {docs.length === 0 && (
              <div className="clay-card p-10 flex flex-col items-center gap-3 text-center">
                <FileText size={22} className="text-default-300" />
                <p className="text-default-400 text-sm">{t('documents.empty')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
