'use client'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileCheck, Loader2 } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'

interface UploadZoneProps {
  onUploaded: () => void
}

export function UploadZone({ onUploaded }: UploadZoneProps) {
  const { t } = useI18n()
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
            : 'border-default-200 hover:border-primary/40 hover:bg-default-50/70'
      }`}
    >
      <input {...getInputProps()} />
      <div
        className={`p-3 rounded-2xl transition-colors ${
          isDragActive
            ? 'bg-primary/15 text-primary'
            : uploading
              ? 'bg-default-100 text-primary'
              : 'bg-default-100 text-default-500'
        }`}
      >
        {uploading ? (
          <Loader2 size={22} className="animate-spin" />
        ) : isDragActive ? (
          <FileCheck size={22} />
        ) : (
          <Upload size={22} />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-default-700">
          {uploading
            ? t('documents.uploadAnalyzing')
            : isDragActive
              ? t('documents.uploadDrop')
              : t('documents.uploadBrowse')}
        </p>
        {!uploading && !isDragActive && (
          <p className="text-xs text-default-400 mt-1">{t('documents.uploadHelp')}</p>
        )}
      </div>
    </div>
  )
}
