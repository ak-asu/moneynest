'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE_NAME,
  type Locale,
  toIntlLocale,
} from '@/lib/i18n/config'
import type { MessageValues } from '@/lib/i18n/messages'
import { messages } from '@/lib/i18n/messages'
import { translate } from '@/lib/i18n/translate'

interface I18nContextValue {
  locale: Locale
  intlLocale: string
  setLocale: (nextLocale: Locale) => Promise<void>
  t: (key: string, values?: MessageValues) => string
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function persistLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${maxAge}; samesite=lax`
}

interface I18nProviderProps {
  locale: Locale
  children: React.ReactNode
}

export function I18nProvider({ locale: initialLocale, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback(async (nextLocale: Locale) => {
    if (!isLocale(nextLocale)) return

    setLocaleState(nextLocale)
    persistLocaleCookie(nextLocale)
    document.documentElement.lang = nextLocale

    // Best-effort profile preference sync.
    void fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: nextLocale }),
    }).catch(() => {})
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    const safeLocale = messages[locale] ? locale : defaultLocale
    const intlLocale = toIntlLocale(safeLocale)

    const formatter = (options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlLocale, options)

    return {
      locale: safeLocale,
      intlLocale,
      setLocale,
      t: (key: string, values?: MessageValues) => translate(safeLocale, key, values),
      formatCurrency: (value: number, options?: Intl.NumberFormatOptions) =>
        formatter({ style: 'currency', currency: 'USD', ...options }).format(
          Number.isFinite(value) ? value : 0
        ),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        formatter(options).format(Number.isFinite(value) ? value : 0),
      formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
        const date = value instanceof Date ? value : new Date(value)
        if (Number.isNaN(date.getTime())) return translate(safeLocale, 'common.unknownDate')
        return new Intl.DateTimeFormat(intlLocale, options).format(date)
      },
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
