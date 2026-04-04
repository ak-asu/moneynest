'use client'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'

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
      className={`clay-card p-8 flex flex-col items-center gap-3 cursor-pointer border-2 border-dashed transition-all ${isDragActive ? 'border-primary bg-primary-50 scale-[1.01]' : 'border-default-200'}`}
    >
      <input {...getInputProps()} />
      <Upload size={28} className={isDragActive ? 'text-primary' : 'text-default-400'} />
      <p className="text-sm text-default-500 text-center">
        {uploading ? '🔍 Extracting...' : isDragActive ? 'Drop to upload' : 'Upload a bill, insurance policy, lease, or pay stub'}
      </p>
    </div>
  )
}
