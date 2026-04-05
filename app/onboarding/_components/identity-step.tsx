'use client'
import { Button } from '@heroui/react'
import { PersonaSelector } from './persona-selector'
import { OptionButton } from './option-button'
import type { PersonaType } from '@/types/database'

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
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-default-foreground">
          Who are you? <span className="text-danger">*</span>
        </p>
        <PersonaSelector value={persona} onChange={onPersonaChange} />
        {personaError && <p className="text-danger text-xs">{personaError}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-default-foreground">Preferred language</p>
        <div className="flex gap-3">
          <OptionButton selected={language === 'en'} onSelect={() => onLanguageChange('en')}>
            English
          </OptionButton>
          <OptionButton selected={language === 'es'} onSelect={() => onLanguageChange('es')}>
            Español
          </OptionButton>
        </div>
      </div>

      <Button variant="primary" className="clay-btn w-full" isDisabled={!persona} onPress={onNext}>
        Next →
      </Button>
    </div>
  )
}
