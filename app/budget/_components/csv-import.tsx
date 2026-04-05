// app/budget/_components/csv-import.tsx
'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@heroui/react'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface CsvImportProps {
  onImported: (count: number) => void
}

export function CsvImport({ onImported }: CsvImportProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setStatus('uploading')
    setMessage('')
    try {
      const text = await file.text()
      const res = await fetch('/api/budget/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Import failed.')
      } else {
        setStatus('success')
        setMessage(`${data.imported} entries imported.`)
        onImported(data.imported)
        setTimeout(() => setStatus('idle'), 4000)
      }
    } catch {
      setStatus('error')
      setMessage('Failed to read file.')
    }
  }, [onImported])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.csv', '.txt'] },
    maxFiles: 1,
    disabled: status === 'uploading',
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-primary-50' : 'border-default-200 hover:border-primary-300'
      } ${status === 'uploading' ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <input {...getInputProps()} />
      {status === 'success' ? (
        <div className="flex flex-col items-center gap-2 text-success">
          <CheckCircle size={24} />
          <p className="text-sm font-medium">{message}</p>
        </div>
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-2 text-danger">
          <AlertCircle size={24} />
          <p className="text-sm">{message}</p>
          <Button size="sm" variant="outline" onPress={() => setStatus('idle')} className="clay-btn">
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-default-400">
          <Upload size={24} />
          <p className="text-sm font-medium text-default-600">
            {status === 'uploading' ? 'Importing…' : isDragActive ? 'Drop CSV here' : 'Import CSV'}
          </p>
          <p className="text-xs">YNAB, Mint, or generic bank export. Drag and drop or click.</p>
        </div>
      )}
    </div>
  )
}
