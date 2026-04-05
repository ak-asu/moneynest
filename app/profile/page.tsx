'use client'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@heroui/react'
import { Plus, Trash2, Save } from 'lucide-react'
import { AppNav } from '@/components/app-nav'
import { HealthScoreRing } from '@/components/health-score-ring'
import { cn } from '@/lib/utils/cn'
import type { DbProfile, PersonaType } from '@/types/database'

const profileSchema = z.object({
  persona: z.enum(['gig_worker', 'student', 'immigrant', 'retiree', 'single_parent', 'other']),
  language: z.enum(['en', 'es']),
  income_monthly: z.coerce.number().min(0),
  income_type: z.enum(['steady', 'irregular']),
  savings_balance: z.coerce.number().min(0),
  expenses: z.array(z.object({ key: z.string().min(1), value: z.coerce.number().min(0) })),
  debts: z.array(z.object({ type: z.string().min(1), amount: z.coerce.number().min(0), rate: z.coerce.number().min(0) })),
  goals: z.array(z.object({ label: z.string().min(1), target_amount: z.coerce.number().min(0), target_date: z.string().min(1) })),
})

type ProfileForm = z.infer<typeof profileSchema>

const PERSONA_OPTIONS: { value: PersonaType; label: string }[] = [
  { value: 'gig_worker', label: 'Gig Worker' },
  { value: 'student', label: 'Student' },
  { value: 'immigrant', label: 'Immigrant' },
  { value: 'retiree', label: 'Retiree' },
  { value: 'single_parent', label: 'Single Parent' },
  { value: 'other', label: 'Other' },
]

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-default-700">{label}</label>
      {children}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  )
}

function MoneyInput({ label, error, ...rest }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-1">
        <span className="text-default-500 text-sm">$</span>
        <input
          type="number"
          className={cn(
            'clay-input w-full rounded-lg border bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400',
            error ? 'border-danger-400' : 'border-default-200',
          )}
          {...rest}
        />
      </div>
    </Field>
  )
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [savedScore, setSavedScore] = useState<number>(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { persona: 'other', language: 'en', income_type: 'steady', income_monthly: 0, savings_balance: 0, expenses: [], debts: [], goals: [] },
  })

  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: 'expenses' })
  const { fields: debtFields, append: appendDebt, remove: removeDebt } = useFieldArray({ control, name: 'debts' })
  const { fields: goalFields, append: appendGoal, remove: removeGoal } = useFieldArray({ control, name: 'goals' })

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then((p: DbProfile | null) => {
        if (!p) return
        setSavedScore(p.financial_health_score)
        const expenses = Object.entries(p.expenses as Record<string, number>).map(([key, value]) => ({ key, value }))
        reset({
          persona: p.persona,
          language: p.language,
          income_monthly: p.income_monthly,
          income_type: p.income_type,
          savings_balance: p.savings_balance ?? 0,
          expenses,
          debts: (p.debts as Array<{ type: string; amount: number; rate: number }>) ?? [],
          goals: (p.goals as Array<{ label: string; target_amount: number; target_date: string }>) ?? [],
        })
      })
      .finally(() => setLoading(false))
  }, [reset]) // reset is stable from react-hook-form; this still runs once in practice

  async function onSubmit(data: ProfileForm) {
    setSaveError(null)
    setSaveSuccess(false)
    const expenses: Record<string, number> = {}
    data.expenses.forEach(e => { expenses[e.key] = e.value })
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona: data.persona,
        language: data.language,
        income_monthly: data.income_monthly,
        income_type: data.income_type,
        expenses,
        debts: data.debts,
        goals: data.goals,
        savings_balance: data.savings_balance,
      }),
    })
    if (!res.ok) {
      setSaveError('Failed to save. Please try again.')
      return
    }
    const updated: DbProfile = await res.json()
    setSavedScore(updated.financial_health_score)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const persona = useWatch({ control, name: 'persona' })
  const language = useWatch({ control, name: 'language' })
  const incomeType = useWatch({ control, name: 'income_type' })

  if (loading) {
    return (
      <div className="flex h-screen">
        <AppNav />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-default-400">Loading profile…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8 max-w-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">My Profile</h1>
              <p className="text-default-500 text-sm mt-1">Your financial identity. All data stays private.</p>
            </div>
            <div className="clay-card p-4 flex flex-col items-center">
              <HealthScoreRing score={savedScore} />
            </div>
          </div>

          {/* Persona */}
          <section className="clay-card p-5 space-y-4">
            <h2 className="font-bold text-base">Identity</h2>
            <Field label="I identify most as" error={errors.persona?.message}>
              <div className="flex flex-wrap gap-2">
                {PERSONA_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setValue('persona', o.value)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm border transition-colors',
                      persona === o.value
                        ? 'bg-primary text-white border-primary'
                        : 'border-default-200 text-default-600 hover:border-primary-300',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Preferred language">
              <div className="flex gap-2">
                {(['en', 'es'] as const).map(lang => (
                  <Button
                    key={lang}
                    type="button"
                    variant={language === lang ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => setValue('language', lang)}
                    className="clay-btn"
                  >
                    {lang === 'en' ? 'English' : 'Español'}
                  </Button>
                ))}
              </div>
            </Field>
          </section>

          {/* Income */}
          <section className="clay-card p-5 space-y-4">
            <h2 className="font-bold text-base">Income</h2>
            <MoneyInput
              label="Monthly income (after taxes)"
              placeholder="2200"
              error={errors.income_monthly?.message}
              {...register('income_monthly')}
            />
            <Field label="Income pattern">
              <div className="flex gap-2">
                {(['steady', 'irregular'] as const).map(t => (
                  <Button
                    key={t}
                    type="button"
                    variant={incomeType === t ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => setValue('income_type', t)}
                    className="clay-btn flex-1"
                  >
                    {t === 'steady' ? 'Same every month' : 'It varies'}
                  </Button>
                ))}
              </div>
            </Field>
            <MoneyInput
              label="Current savings balance"
              placeholder="0"
              error={errors.savings_balance?.message}
              {...register('savings_balance')}
            />
          </section>

          {/* Expenses */}
          <section className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Monthly Expenses</h2>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={() => appendExpense({ key: '', value: 0 })}
                className="clay-btn gap-1"
              >
                <Plus size={14} />
                Add
              </Button>
            </div>
            {expenseFields.map((field, i) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    placeholder="Category (e.g. rent)"
                    className="clay-input w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
                    {...register(`expenses.${i}.key`)}
                  />
                  {errors.expenses?.[i]?.key && (
                    <p className="text-danger text-xs mt-0.5">{errors.expenses[i].key?.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 w-32">
                  <span className="text-default-500 text-sm">$</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="clay-input w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
                    {...register(`expenses.${i}.value`)}
                  />
                </div>
                <button type="button" onClick={() => removeExpense(i)} className="p-2 text-danger hover:bg-danger-50 rounded-lg mt-0.5">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {expenseFields.length === 0 && (
              <p className="text-default-400 text-sm">No expenses added yet.</p>
            )}
          </section>

          {/* Debts */}
          <section className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Debts</h2>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={() => appendDebt({ type: '', amount: 0, rate: 0 })}
                className="clay-btn gap-1"
              >
                <Plus size={14} />
                Add
              </Button>
            </div>
            {debtFields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_100px_80px_auto] gap-2 items-start">
                <input
                  placeholder="Type (e.g. credit card)"
                  className="clay-input rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
                  {...register(`debts.${i}.type`)}
                />
                <div className="flex items-center gap-1">
                  <span className="text-default-500 text-xs">$</span>
                  <input
                    type="number"
                    placeholder="Amount"
                    className="clay-input w-full rounded-lg border border-default-200 bg-default-50 px-2 py-2 text-sm outline-none focus:border-primary-400"
                    {...register(`debts.${i}.amount`)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Rate"
                    className="clay-input w-full rounded-lg border border-default-200 bg-default-50 px-2 py-2 text-sm outline-none focus:border-primary-400"
                    {...register(`debts.${i}.rate`)}
                  />
                  <span className="text-default-500 text-xs">%</span>
                </div>
                <button type="button" onClick={() => removeDebt(i)} className="p-2 text-danger hover:bg-danger-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {debtFields.length === 0 && (
              <p className="text-default-400 text-sm">No debts recorded — great!</p>
            )}
          </section>

          {/* Goals */}
          <section className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Goals</h2>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={() => appendGoal({ label: '', target_amount: 0, target_date: '' })}
                className="clay-btn gap-1"
              >
                <Plus size={14} />
                Add
              </Button>
            </div>
            {goalFields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_120px_140px_auto] gap-2 items-start">
                <input
                  placeholder="Goal (e.g. emergency fund)"
                  className="clay-input rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
                  {...register(`goals.${i}.label`)}
                />
                <div className="flex items-center gap-1">
                  <span className="text-default-500 text-xs">$</span>
                  <input
                    type="number"
                    placeholder="Amount"
                    className="clay-input w-full rounded-lg border border-default-200 bg-default-50 px-2 py-2 text-sm outline-none focus:border-primary-400"
                    {...register(`goals.${i}.target_amount`)}
                  />
                </div>
                <input
                  type="date"
                  className="clay-input rounded-lg border border-default-200 bg-default-50 px-2 py-2 text-sm outline-none focus:border-primary-400"
                  {...register(`goals.${i}.target_date`)}
                />
                <button type="button" onClick={() => removeGoal(i)} className="p-2 text-danger hover:bg-danger-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {goalFields.length === 0 && (
              <p className="text-default-400 text-sm">No goals yet. Add one to track your progress.</p>
            )}
          </section>

          {saveError && <p className="text-danger text-sm">{saveError}</p>}
          {saveSuccess && <p className="text-success text-sm">Profile saved successfully.</p>}

          <Button
            type="submit"
            variant="primary"
            isDisabled={isSubmitting}
            className="clay-btn gap-2 w-full sm:w-auto"
          >
            <Save size={16} />
            {isSubmitting ? 'Saving…' : 'Save Profile'}
          </Button>
        </form>
      </main>
    </div>
  )
}
