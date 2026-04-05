import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/components/i18n-provider'

const STEP_KEYS = [
  'onboarding.step.identity',
  'onboarding.step.income',
  'onboarding.step.expenses',
] as const

interface StepIndicatorProps {
  current: number
}

export function StepIndicator({ current }: StepIndicatorProps) {
  const { t } = useI18n()

  return (
    <div className="flex items-center">
      {STEP_KEYS.map((labelKey, i) => (
        <div key={labelKey} className="flex items-center flex-1">
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
              {t(labelKey)}
            </span>
          </div>
          {i < STEP_KEYS.length - 1 && (
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
