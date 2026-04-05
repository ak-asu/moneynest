import { cookies, headers } from 'next/headers'
import {
  getPreferredLocaleFromHeader,
  isLocale,
  LOCALE_COOKIE_NAME,
  type Locale,
  toIntlLocale,
} from './config'
import { messages, type MessageValues } from './messages'
import { translate } from './translate'

function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue
  return getPreferredLocaleFromHeader(acceptLanguage)
}

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value
  return pickLocale(cookieLocale, headerStore.get('accept-language'))
}

export async function getServerI18n() {
  const locale = await getServerLocale()
  return {
    locale,
    intlLocale: toIntlLocale(locale),
    messages: messages[locale],
    t: (key: string, values?: MessageValues) => translate(locale, key, values),
  }
}
