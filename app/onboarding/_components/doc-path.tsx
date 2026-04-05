'use client'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@heroui/react'
import { Upload, FileText } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'

interface DocPathProps {
  onComplete: () => void
}

export function DocPath({ onComplete }: DocPathProps) {
  const { t } = useI18n()
  const [status, setStatus] = useState<'idle' | 'uploading' | 'extracting' | 'done' | 'error'>(
    'idle'
  )
  const [fileName, setFileName] = useState('')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
    onDrop: async ([file]) => {
      if (!file) return
      setFileName(file.name)
      setStatus('uploading')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('isOnboarding', 'true')

      try {
        setStatus('extracting')
        const res = await fetch('/api/documents/extract', { method: 'POST', body: formData })
        if (!res.ok) throw new Error()
        setStatus('done')
      } catch {
        setStatus('error')
      }
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-default-600 leading-relaxed">{t('onboarding.doc.prompt')}</p>
      <div
        {...getRootProps()}
        className={`clay-card p-12 flex flex-col items-center gap-4 cursor-pointer border-2 border-dashed transition-colors ${isDragActive ? 'border-primary bg-primary-50' : 'border-default-200 hover:border-primary-300 hover:bg-default-50'}`}
      >
        <input {...getInputProps()} />
        <Upload size={36} className="text-default-400" />
        <p className="text-sm text-default-500 text-center">
          {isDragActive ? t('onboarding.doc.dropHere') : t('onboarding.doc.dragOrClick')}
        </p>
        <p className="text-xs text-default-400">{t('onboarding.doc.fileTypeHelp')}</p>
      </div>
      {(status === 'uploading' || status === 'extracting') && (
        <p className="text-sm text-primary animate-pulse">
          {status === 'uploading' ? t('onboarding.doc.uploading') : t('onboarding.doc.extracting')}
        </p>
      )}
      {status === 'done' && (
        <div className="clay-card p-4 flex items-center gap-3">
          <FileText size={20} className="text-success" />
          <div>
            <p className="text-sm font-semibold">{fileName}</p>
            <p className="text-xs text-default-500">{t('onboarding.doc.updated')}</p>
          </div>
          <Button size="sm" variant="primary" className="clay-btn ml-auto" onPress={onComplete}>
            {t('common.continue')}
          </Button>
        </div>
      )}
      {status === 'error' && (
        <p className="text-danger text-sm">{t('onboarding.doc.uploadFailed')}</p>
      )}
    </div>
  )
}
