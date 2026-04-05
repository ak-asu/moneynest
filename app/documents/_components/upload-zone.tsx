'use client'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileCheck, Loader2 } from 'lucide-react'

interface UploadZoneProps {
  onUploaded: () => void
}

export function UploadZone({ onUploaded }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
    onDrop: async ([file]) => {
      if (!file) return
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      await fetch('/api/documents/extract', { method: 'POST', body: formData })
      setUploading(false)
      onUploaded()
    },
  })

  return (
    <div
      {...getRootProps()}
      className={`clay-card px-8 py-7 flex flex-col items-center gap-3 cursor-pointer border-2 border-dashed transition-all select-none ${
        isDragActive
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : uploading
          ? 'border-default-200 opacity-70 pointer-events-none'
          : 'border-default-200 hover:border-primary/40 hover:bg-white/5 dark:hover:bg-white/[0.02]'
      }`}
    >
      <input {...getInputProps()} />
      <div className={`p-3 rounded-2xl transition-colors ${
        isDragActive
          ? 'bg-primary/15 text-primary'
          : uploading
          ? 'bg-default-100 dark:bg-white/5 text-primary'
          : 'bg-default-100 dark:bg-white/5 text-default-400'
      }`}>
        {uploading
          ? <Loader2 size={22} className="animate-spin" />
          : isDragActive
          ? <FileCheck size={22} />
          : <Upload size={22} />}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-default-600 dark:text-default-300">
          {uploading
            ? 'Analyzing document...'
            : isDragActive
            ? 'Drop to add to vault'
            : 'Drop a document or click to browse'}
        </p>
        {!uploading && !isDragActive && (
          <p className="text-xs text-default-400 mt-1">
            Bills · Insurance · Leases · Pay Stubs &nbsp;·&nbsp; PDF or image
          </p>
        )}
      </div>
    </div>
  )
}
