'use client'
import { useCallback, useEffect, useState } from 'react'
import { UploadZone } from './_components/upload-zone'
import { DocumentCard } from './_components/document-card'
import type { DbDocument } from '@/types/database'

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DbDocument[]>([])

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
    fetchDocs().then((initialDocs) => {
      if (!cancelled) {
        setDocs(initialDocs)
      }
    })
    return () => {
      cancelled = true
    }
  }, [fetchDocs])

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Document Vault</h1>
      <UploadZone onUploaded={loadDocs} />
      <div className="flex flex-col gap-3">
        {docs.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
        {docs.length === 0 && (
          <p className="text-default-400 text-sm text-center py-8">No documents yet. Upload one above.</p>
        )}
      </div>
    </div>
  )
}
