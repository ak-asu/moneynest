import type { Locale } from './config'
import type { MessageValues } from './messages'
import { messages } from './messages'

function interpolate(template: string, values?: MessageValues): string {
  if (!values) return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key]
    return value == null ? `{${key}}` : String(value)
  })
}

export function translate(locale: Locale, key: string, values?: MessageValues): string {
  const template = messages[locale][key] ?? messages.en[key] ?? key
  return interpolate(template, values)
}
