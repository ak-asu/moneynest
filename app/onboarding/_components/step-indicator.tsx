import { cn } from '@/lib/utils/cn'

const STEPS = ['Identity', 'Income', 'Expenses'] as const

interface StepIndicatorProps {
  current: number
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < current && 'bg-accent text-white',
                i === current && 'border-2 border-accent text-accent bg-accent-soft',
                i > current && 'border-2 border-default text-default-foreground'
              )}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span
              className={cn('text-xs font-medium', i === current ? 'text-accent' : 'text-muted')}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'h-px flex-1 mb-6 mx-1 transition-colors',
                i < current ? 'bg-accent' : 'bg-default'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
