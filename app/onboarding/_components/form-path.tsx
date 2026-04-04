'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@heroui/react'
import { PersonaSelector } from './persona-selector'
import { cn } from '@/lib/utils/cn'
import type { PersonaType } from '@/types/database'

const schema = z.object({
  persona: z.enum(['gig_worker', 'student', 'immigrant', 'retiree', 'single_parent', 'other']),
  language: z.enum(['en', 'es']),
  income_monthly: z.coerce.number().min(1),
  income_type: z.enum(['steady', 'irregular']),
  rent: z.coerce.number().min(0),
  food: z.coerce.number().min(0),
  transport: z.coerce.number().min(0),
  other_expenses: z.coerce.number().min(0),
  savings_balance: z.coerce.number().min(0),
})

type FormData = z.infer<typeof schema>

interface FormPathProps {
  onComplete: () => void
}

const STEPS = ['identity', 'income', 'expenses'] as const

function MoneyInput({
  label,
  placeholder,
  error,
  className,
  ...rest
}: {
  label: string
  placeholder?: string
  error?: string
  className?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-default-700">{label}</label>
      <div className="flex items-center gap-1">
        <span className="text-default-500 text-sm">$</span>
        <input
          type="number"
          placeholder={placeholder}
          className={cn(
            'clay-input w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400',
            error ? 'border-danger-400' : '',
            className,
          )}
          {...rest}
        />
      </div>
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  )
}

export function FormPath({ onComplete }: FormPathProps) {
  const [step, setStep] = useState(0)
  const [persona, setPersona] = useState<PersonaType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { language: 'en', income_type: 'steady' },
  })

  async function onSubmit(data: FormData) {
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
      setError('Failed to save profile. Please try again.')
      return
    }
    onComplete()
  }

  const currentStep = STEPS[step]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {currentStep === 'identity' && (
        <>
          <h3 className="font-bold text-lg">Who are you?</h3>
          <PersonaSelector
            value={persona}
            onChange={(p) => {
              setPersona(p)
              setValue('persona', p)
            }}
          />
          {errors.persona && (
            <p className="text-danger text-sm">{errors.persona.message}</p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onPress={() => setValue('language', 'en')}
              className={cn('clay-btn', watch('language') === 'en' ? 'border-primary' : '')}
            >
              English
            </Button>
            <Button
              type="button"
              variant="outline"
              onPress={() => setValue('language', 'es')}
              className={cn('clay-btn', watch('language') === 'es' ? 'border-primary' : '')}
            >
              Español
            </Button>
          </div>
          <Button
            type="button"
            variant="primary"
            className="clay-btn"
            onPress={() => step < STEPS.length - 1 && setStep((s) => s + 1)}
            isDisabled={!persona}
          >
            Next →
          </Button>
        </>
      )}

      {currentStep === 'income' && (
        <>
          <h3 className="font-bold text-lg">Your income</h3>
          <MoneyInput
            label="Monthly income (after taxes)"
            placeholder="2200"
            error={errors.income_monthly?.message}
            {...register('income_monthly')}
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onPress={() => setValue('income_type', 'steady')}
              className={cn(
                'clay-btn flex-1',
                watch('income_type') === 'steady' ? 'bg-primary-100' : '',
              )}
            >
              Same every month
            </Button>
            <Button
              type="button"
              variant="ghost"
              onPress={() => setValue('income_type', 'irregular')}
              className={cn(
                'clay-btn flex-1',
                watch('income_type') === 'irregular' ? 'bg-primary-100' : '',
              )}
            >
              It varies
            </Button>
          </div>
          <MoneyInput
            label="Current savings balance"
            placeholder="0"
            {...register('savings_balance')}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onPress={() => setStep((s) => s - 1)}
              className="clay-btn"
            >
              ← Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onPress={() => setStep((s) => s + 1)}
              className="clay-btn flex-1"
            >
              Next →
            </Button>
          </div>
        </>
      )}

      {currentStep === 'expenses' && (
        <>
          <h3 className="font-bold text-lg">Your monthly expenses</h3>
          {(
            [
              { name: 'rent', label: 'Rent / Mortgage', placeholder: '1100' },
              { name: 'food', label: 'Food & Groceries', placeholder: '400' },
              { name: 'transport', label: 'Transport', placeholder: '200' },
              { name: 'other_expenses', label: 'Everything else', placeholder: '300' },
            ] as const
          ).map((f) => (
            <MoneyInput
              key={f.name}
              label={f.label}
              placeholder={f.placeholder}
              error={errors[f.name]?.message}
              {...register(f.name)}
            />
          ))}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onPress={() => setStep((s) => s - 1)}
              className="clay-btn"
            >
              ← Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              isDisabled={isSubmitting}
              className="clay-btn flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Complete setup'}
            </Button>
          </div>
        </>
      )}
      {error && <p className="text-danger text-sm">{error}</p>}
    </form>
  )
}
