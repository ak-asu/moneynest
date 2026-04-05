'use client'
import { useForm } from 'react-hook-form'
import { Button } from '@heroui/react'
import { MoneyInput } from '@/components/ui/money-input'
import type { OnboardingFormData } from './form-schema'
import { useI18n } from '@/components/i18n-provider'

interface ExpensesStepProps {
  register: ReturnType<typeof useForm<OnboardingFormData>>['register']
  errors: Partial<Record<keyof OnboardingFormData, { message?: string }>>
  isSubmitting: boolean
  onBack: () => void
}

export function ExpensesStep({ register, errors, isSubmitting, onBack }: ExpensesStepProps) {
  const { t } = useI18n()

  const localizedFields = [
    { name: 'rent', label: t('onboarding.expense.rent'), placeholder: '1100' },
    { name: 'food', label: t('onboarding.expense.food'), placeholder: '400' },
    { name: 'transport', label: t('onboarding.expense.transport'), placeholder: '200' },
    { name: 'other_expenses', label: t('onboarding.expense.other'), placeholder: '300' },
  ] as const

  return (
    <div className="flex flex-col gap-6">
      {localizedFields.map((f) => (
        <MoneyInput
          key={f.name}
          label={f.label}
          placeholder={f.placeholder}
          required
          error={errors[f.name]?.message}
          {...register(f.name)}
        />
      ))}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" className="clay-btn" onPress={onBack}>
          {t('common.back')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="clay-btn flex-1"
          isDisabled={isSubmitting}
        >
          {isSubmitting ? t('common.saving') : t('onboarding.completeSetup')}
        </Button>
      </div>
    </div>
  )
}
