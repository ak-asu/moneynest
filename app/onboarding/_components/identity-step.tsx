'use client'
import { Button } from '@heroui/react'
import { PersonaSelector } from './persona-selector'
import { OptionButton } from './option-button'
import type { PersonaType } from '@/types/database'
import { useI18n } from '@/components/i18n-provider'

interface IdentityStepProps {
  persona: PersonaType | null
  language: string
  personaError?: string
  onPersonaChange: (p: PersonaType) => void
  onLanguageChange: (l: 'en' | 'es') => void
  onNext: () => void
}

export function IdentityStep({
  persona,
  language,
  personaError,
  onPersonaChange,
  onLanguageChange,
  onNext,
}: IdentityStepProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-default-foreground">
          {t('onboarding.identity.question')}{' '}
          <span className="text-danger">{t('onboarding.identity.required')}</span>
        </p>
        <PersonaSelector value={persona} onChange={onPersonaChange} />
        {personaError && <p className="text-danger text-xs">{personaError}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-default-foreground">
          {t('onboarding.identity.preferredLanguage')}
        </p>
        <div className="flex gap-3">
          <OptionButton selected={language === 'en'} onSelect={() => onLanguageChange('en')}>
            {t('common.english')}
          </OptionButton>
          <OptionButton selected={language === 'es'} onSelect={() => onLanguageChange('es')}>
            {t('common.spanish')}
          </OptionButton>
        </div>
      </div>

      <Button variant="primary" className="clay-btn w-full" isDisabled={!persona} onPress={onNext}>
        {t('common.next')}
      </Button>
    </div>
  )
}
