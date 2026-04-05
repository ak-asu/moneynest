'use client'

import { Languages } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils/cn'
import type { Locale } from '@/lib/i18n/config'

interface LocaleSwitcherProps {
  compact?: boolean
}

const OPTIONS: Array<{ value: Locale; labelKey: string; short: string }> = [
  { value: 'en', labelKey: 'common.english', short: 'EN' },
  { value: 'es', labelKey: 'common.spanish', short: 'ES' },
]

export function LocaleSwitcher({ compact = false }: LocaleSwitcherProps) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      aria-label={t('nav.localeLabel')}
      className={cn(
        'flex items-center rounded-xl border border-default-200 bg-default-50/80 p-1',
        compact ? 'gap-1 justify-center' : 'gap-2'
      )}
    >
      <Languages size={14} className="text-default-500 shrink-0" />
      <div className="flex items-center gap-1">
        {OPTIONS.map((option) => {
          const active = locale === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void setLocale(option.value)}
              aria-pressed={active}
              title={t(option.labelKey)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                active
                  ? 'bg-primary/15 text-primary-700 border border-primary/25'
                  : 'text-default-500 hover:text-default-700'
              )}
            >
              {compact ? option.short : t(option.labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
