'use client'
import { cn } from '@/lib/utils/cn'
import type { PersonaType } from '@/types/database'
import { useI18n } from '@/components/i18n-provider'

const PERSONAS: Array<{
  value: PersonaType
  labelKey: string
  emoji: string
  descriptionKey: string
}> = [
  {
    value: 'gig_worker',
    labelKey: 'onboarding.persona.gig_worker.label',
    emoji: '🚗',
    descriptionKey: 'onboarding.persona.gig_worker.description',
  },
  {
    value: 'student',
    labelKey: 'onboarding.persona.student.label',
    emoji: '🎓',
    descriptionKey: 'onboarding.persona.student.description',
  },
  {
    value: 'immigrant',
    labelKey: 'onboarding.persona.immigrant.label',
    emoji: '🌎',
    descriptionKey: 'onboarding.persona.immigrant.description',
  },
  {
    value: 'single_parent',
    labelKey: 'onboarding.persona.single_parent.label',
    emoji: '👨‍👧',
    descriptionKey: 'onboarding.persona.single_parent.description',
  },
  {
    value: 'retiree',
    labelKey: 'onboarding.persona.retiree.label',
    emoji: '🏡',
    descriptionKey: 'onboarding.persona.retiree.description',
  },
  {
    value: 'other',
    labelKey: 'onboarding.persona.other.label',
    emoji: '👤',
    descriptionKey: 'onboarding.persona.other.description',
  },
]

interface PersonaSelectorProps {
  value: PersonaType | null
  onChange: (p: PersonaType) => void
}

export function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  const { t } = useI18n()

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {PERSONAS.map(({ value: personaValue, labelKey, emoji, descriptionKey }) => (
        <button
          key={personaValue}
          type="button"
          onClick={() => onChange(personaValue)}
          className={cn(
            'clay-card p-5 text-left flex flex-col gap-2 cursor-pointer transition-all hover:border-primary-300',
            value === personaValue
              ? 'ring-2 ring-primary border-primary-400 bg-primary-50 scale-[1.02]'
              : 'hover:bg-default-50'
          )}
        >
          <span className="text-3xl">{emoji}</span>
          <span className="font-semibold text-sm">{t(labelKey)}</span>
          <span className="text-xs text-default-400 leading-relaxed">{t(descriptionKey)}</span>
        </button>
      ))}
    </div>
  )
}
