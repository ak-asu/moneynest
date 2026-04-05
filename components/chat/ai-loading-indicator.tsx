'use client'

interface AiLoadingIndicatorProps {
  label?: string
  className?: string
}

export function AiLoadingIndicator({
  label = 'Vela is responding...',
  className = '',
}: AiLoadingIndicatorProps) {
  return (
    <div role="status" aria-live="polite" className={`clay-card px-4 py-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-end gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.24s]" />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.12s]" />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
        </div>
        <span className="text-xs text-default-500">{label}</span>
      </div>
    </div>
  )
}
