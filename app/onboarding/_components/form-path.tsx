'use client'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { StepIndicator } from './step-indicator'
import { IdentityStep } from './identity-step'
import { IncomeStep } from './income-step'
import { ExpensesStep } from './expenses-step'
import { onboardingSchema, type OnboardingFormData } from './form-schema'
import type { PersonaType } from '@/types/database'

export function FormPath({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [persona, setPersona] = useState<PersonaType | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
    setValue,
    control,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { language: 'en', income_type: 'steady' },
  })

  const language = useWatch({ control, name: 'language' })
  const incomeType = useWatch({ control, name: 'income_type' })

  async function onSubmit(data: OnboardingFormData) {
    const { rent, food, transport, other_expenses, savings_balance, ...profile } = data
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profile,
        expenses: { rent, food, transport, other: other_expenses },
        onboarding_completed: true,
        savings_balance,
      }),
    })
    if (!res.ok) {
      setSubmitError('Failed to save. Please try again.')
      return
    }
    onComplete()
  }

  async function handleIncomeNext() {
    const valid = await trigger(['income_monthly', 'savings_balance'])
    if (valid) setStep(2)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <StepIndicator current={step} />

      {step === 0 && (
        <IdentityStep
          persona={persona}
          language={language}
          personaError={errors.persona?.message}
          onPersonaChange={(p) => {
            setPersona(p)
            setValue('persona', p)
          }}
          onLanguageChange={(l) => setValue('language', l)}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <IncomeStep
          incomeType={incomeType}
          register={register}
          errors={errors}
          onIncomeTypeChange={(t) => setValue('income_type', t)}
          onBack={() => setStep(0)}
          onNext={handleIncomeNext}
        />
      )}

      {step === 2 && (
        <ExpensesStep
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          onBack={() => setStep(1)}
        />
      )}

      {submitError && <p className="text-danger text-sm">{submitError}</p>}
    </form>
  )
}
