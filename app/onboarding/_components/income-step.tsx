'use client'
import { useForm } from 'react-hook-form'
import { Button } from '@heroui/react'
import { MoneyInput } from '@/components/ui/money-input'
import { OptionButton } from './option-button'
import type { OnboardingFormData } from './form-schema'
import { useI18n } from '@/components/i18n-provider'

interface IncomeStepProps {
  incomeType: string
  register: ReturnType<typeof useForm<OnboardingFormData>>['register']
  errors: Partial<Record<keyof OnboardingFormData, { message?: string }>>
  onIncomeTypeChange: (t: 'steady' | 'irregular') => void
  onBack: () => void
  onNext: () => void
}

export function IncomeStep({
  incomeType,
  register,
  errors,
  onIncomeTypeChange,
  onBack,
  onNext,
}: IncomeStepProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <MoneyInput
        label={t('onboarding.income.monthly')}
        placeholder="2200"
        required
        error={errors.income_monthly?.message}
        {...register('income_monthly')}
      />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-default-foreground">
          {t('onboarding.income.type')}{' '}
          <span className="text-danger">{t('onboarding.identity.required')}</span>
        </p>
        <div className="flex gap-3">
          <OptionButton
            selected={incomeType === 'steady'}
            onSelect={() => onIncomeTypeChange('steady')}
          >
            {t('onboarding.income.sameMonthly')}
          </OptionButton>
          <OptionButton
            selected={incomeType === 'irregular'}
            onSelect={() => onIncomeTypeChange('irregular')}
          >
            {t('onboarding.income.varies')}
          </OptionButton>
        </div>
      </div>

      <MoneyInput
        label={t('onboarding.income.savingsBalance')}
        placeholder="0"
        error={errors.savings_balance?.message}
        {...register('savings_balance')}
      />

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" className="clay-btn" onPress={onBack}>
          {t('common.back')}
        </Button>
        <Button variant="primary" className="clay-btn flex-1" onPress={onNext}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
