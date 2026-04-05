'use client'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { AppNav } from '@/components/app-nav'
import { UploadZone } from './_components/upload-zone'
import { DocumentCard } from './_components/document-card'
import type { DbDocument, DbProfile, DocumentKind } from '@/types/database'
import { Search, FileText } from 'lucide-react'

const DOC_TYPE_LABELS: Record<DocumentKind | 'all', string> = {
  all: 'All',
  insurance: 'Insurance',
  lease: 'Lease',
  bill: 'Bill',
  payslip: 'Pay Stub',
  other: 'Other',
}

const ALL_FILTER_TYPES: Array<DocumentKind | 'all'> = ['all', 'insurance', 'lease', 'bill', 'payslip', 'other']

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DbDocument[]>([])
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DocumentKind | 'all'>('all')

  const fetchDocs = useCallback(async (): Promise<DbDocument[]> => {
    try {
      const res = await fetch('/api/documents')
      if (!res.ok) return []
      return await res.json() as DbDocument[]
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
      fetch('/api/profile').then(r => r.ok ? r.json() as Promise<DbProfile> : null).catch(() => null),
    ]).then(([initialDocs, prof]) => {
      if (!cancelled) {
        setDocs(initialDocs)
        setProfile(prof)
      }
    })

    return () => { cancelled = true }
  }, [fetchDocs])

  const filtered = useMemo(() => {
    return docs.filter(doc => {
      const matchType = filter === 'all' || doc.document_type === filter
      const q = search.toLowerCase().trim()
      const matchSearch = !q
        || doc.filename.toLowerCase().includes(q)
        || doc.ai_explanation?.plain_summaries.some(s => s.toLowerCase().includes(q))
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
    () => ALL_FILTER_TYPES.filter(t => t === 'all' || (counts[t] ?? 0) > 0),
    [counts],
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Document Vault</h1>
            <p className="text-sm text-default-400 mt-1">
              {docs.length === 0
                ? 'Securely store and analyze your financial documents'
                : `${docs.length} document${docs.length !== 1 ? 's' : ''} · AI-analyzed and organized`}
            </p>
          </div>

          {/* Upload Zone */}
          <UploadZone onUploaded={loadDocs} />

          {/* Search + Filters */}
          {docs.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-default-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search by filename or content..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full clay-input pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all dark:text-white placeholder:text-default-400"
                />
              </div>

              {visibleTypes.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {visibleTypes.map(t => {
                    const count = counts[t] ?? 0
                    const active = filter === t
                    return (
                      <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                          active
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-default-100/50 dark:bg-white/5 text-default-500 border-default-200 dark:border-white/10 hover:border-primary/40 hover:text-default-800 dark:hover:text-white'
                        }`}
                      >
                        {DOC_TYPE_LABELS[t]}
                        {count > 0 && (
                          <span className={`ml-1 ${active ? 'opacity-80' : 'opacity-50'}`}>({count})</span>
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
            {filtered.map(doc => (
              <DocumentCard key={doc.id} doc={doc} profile={profile} />
            ))}

            {filtered.length === 0 && docs.length > 0 && (
              <div className="clay-card p-10 flex flex-col items-center gap-3 text-center">
                <Search size={22} className="text-default-300" />
                <p className="text-default-400 text-sm">No documents match your search.</p>
                <button
                  onClick={() => { setSearch(''); setFilter('all') }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {docs.length === 0 && (
              <div className="clay-card p-10 flex flex-col items-center gap-3 text-center">
                <FileText size={22} className="text-default-300" />
                <p className="text-default-400 text-sm">Your vault is empty. Upload a document above to get started.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
