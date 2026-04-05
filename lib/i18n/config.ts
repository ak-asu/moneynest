export const LOCALE_COOKIE_NAME = 'vela_locale'

export const locales = ['en', 'es'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'es'
}

export function toIntlLocale(locale: Locale): string {
  return locale === 'es' ? 'es-ES' : 'en-US'
}

export function getPreferredLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale

  const lowered = acceptLanguage.toLowerCase()
  if (lowered.includes('es')) return 'es'
  return defaultLocale
}
