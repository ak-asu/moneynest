'use client'
import { useForm } from 'react-hook-form'
import { Button } from '@heroui/react'
import { MoneyInput } from '@/components/ui/money-input'
import type { OnboardingFormData } from './form-schema'

const EXPENSE_FIELDS: {
  name: keyof Pick<OnboardingFormData, 'rent' | 'food' | 'transport' | 'other_expenses'>
  label: string
  placeholder: string
}[] = [
  { name: 'rent', label: 'Rent / Mortgage', placeholder: '1100' },
  { name: 'food', label: 'Food & Groceries', placeholder: '400' },
  { name: 'transport', label: 'Transport', placeholder: '200' },
  { name: 'other_expenses', label: 'Everything else', placeholder: '300' },
]

interface ExpensesStepProps {
  register: ReturnType<typeof useForm<OnboardingFormData>>['register']
  errors: Partial<Record<keyof OnboardingFormData, { message?: string }>>
  isSubmitting: boolean
  onBack: () => void
}

export function ExpensesStep({ register, errors, isSubmitting, onBack }: ExpensesStepProps) {
  return (
    <div className="flex flex-col gap-6">
      {EXPENSE_FIELDS.map((f) => (
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
          ← Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="clay-btn flex-1"
          isDisabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Complete setup'}
        </Button>
      </div>
    </div>
  )
}
