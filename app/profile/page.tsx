'use client'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@heroui/react'
import {
  Plus,
  Trash2,
  Save,
  Wallet,
  BadgeDollarSign,
  Target,
  UserRound,
  CreditCard,
} from 'lucide-react'
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
  debts: z.array(
    z.object({
      type: z.string().min(1),
      amount: z.coerce.number().min(0),
      rate: z.coerce.number().min(0),
    })
  ),
  goals: z.array(
    z.object({
      label: z.string().min(1),
      target_amount: z.coerce.number().min(0),
      target_date: z.string().min(1),
    })
  ),
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

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-default-700">{label}</label>
      {children}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  )
}

function MoneyInput({
  label,
  error,
  ...rest
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-1">
        <span className="text-default-500 text-sm">$</span>
        <input
          type="number"
          className={cn(
            'clay-input w-full rounded-lg border bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400',
            error ? 'border-danger-400' : 'border-default-200'
          )}
          {...rest}
        />
      </div>
    </Field>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
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
    defaultValues: {
      persona: 'other',
      language: 'en',
      income_type: 'steady',
      income_monthly: 0,
      savings_balance: 0,
      expenses: [],
      debts: [],
      goals: [],
    },
  })

  const {
    fields: expenseFields,
    append: appendExpense,
    remove: removeExpense,
  } = useFieldArray({ control, name: 'expenses' })
  const {
    fields: debtFields,
    append: appendDebt,
    remove: removeDebt,
  } = useFieldArray({ control, name: 'debts' })
  const {
    fields: goalFields,
    append: appendGoal,
    remove: removeGoal,
  } = useFieldArray({ control, name: 'goals' })

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((p: DbProfile | null) => {
        if (!p) return
        setSavedScore(p.financial_health_score)
        const expenses = Object.entries(p.expenses as Record<string, number>).map(
          ([key, value]) => ({ key, value })
        )
        reset({
          persona: p.persona,
          language: p.language,
          income_monthly: p.income_monthly,
          income_type: p.income_type,
          savings_balance: p.savings_balance ?? 0,
          expenses,
          debts: (p.debts as Array<{ type: string; amount: number; rate: number }>) ?? [],
          goals:
            (p.goals as Array<{ label: string; target_amount: number; target_date: string }>) ?? [],
        })
      })
      .finally(() => setLoading(false))
  }, [reset]) // reset is stable from react-hook-form; this still runs once in practice

  async function onSubmit(data: ProfileForm) {
    setSaveError(null)
    setSaveSuccess(false)
    const expenses: Record<string, number> = {}
    data.expenses.forEach((e) => {
      expenses[e.key] = e.value
    })
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
  const incomeMonthly = useWatch({ control, name: 'income_monthly' }) ?? 0
  const savingsBalance = useWatch({ control, name: 'savings_balance' }) ?? 0
  const expenses = useWatch({ control, name: 'expenses' }) ?? []
  const debts = useWatch({ control, name: 'debts' }) ?? []
  const goals = useWatch({ control, name: 'goals' }) ?? []

  const totalExpenses = expenses.reduce((sum, item) => sum + (Number(item?.value) || 0), 0)
  const totalDebt = debts.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0)
  const totalGoalTarget = goals.reduce((sum, item) => sum + (Number(item?.target_amount) || 0), 0)
  const monthlyLeft = Math.max(0, (Number(incomeMonthly) || 0) - totalExpenses)
  const selectedPersona = PERSONA_OPTIONS.find((option) => option.value === persona)

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
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.07),transparent_24%)]">
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-7xl p-6 space-y-8">
          <section className="clay-card overflow-hidden border border-white/10 bg-gradient-to-br from-default-100 to-default-50">
            <div className="grid gap-6 p-6 xl:grid-cols-[1.35fr_340px] xl:items-center">
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Financial Identity
                  </div>
                  <h1 className="text-4xl font-black tracking-tight">My Profile</h1>
                  <p className="max-w-2xl text-default-500">
                    Shape your money setup in one place. Your identity, cash flow, debts, and goals
                    all feed the advice you get across Vela.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-default-50/80 p-4">
                    <div className="mb-2 flex items-center gap-2 text-default-500">
                      <UserRound size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                        Persona
                      </span>
                    </div>
                    <div className="text-lg font-bold">{selectedPersona?.label ?? 'Other'}</div>
                    <div className="text-sm text-default-500">
                      {language === 'en' ? 'English' : 'Español'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-emerald-300">
                      <BadgeDollarSign size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                        Income
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      {formatMoney(Number(incomeMonthly) || 0)}
                    </div>
                    <div className="text-sm text-default-500">
                      {incomeType === 'steady' ? 'Same every month' : 'Income varies'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-amber-300">
                      <Wallet size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                        Monthly Left
                      </span>
                    </div>
                    <div className="text-lg font-bold">{formatMoney(monthlyLeft)}</div>
                    <div className="text-sm text-default-500">
                      {formatMoney(totalExpenses)} in expenses
                    </div>
                  </div>
                  <div className="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sky-300">
                      <Target size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                        Savings
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      {formatMoney(Number(savingsBalance) || 0)}
                    </div>
                    <div className="text-sm text-default-500">{goals.length} active goals</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center xl:justify-end">
                <div className="rounded-[28px] border border-white/10 bg-default-100/80 p-6 shadow-2xl shadow-black/10">
                  <HealthScoreRing score={savedScore} />
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <section className="clay-card p-6 space-y-5 xl:col-span-5">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Profile Basics
                </div>
                <h2 className="text-2xl font-bold">Identity</h2>
                <p className="text-sm text-default-500">
                  Tell Vela who you are so your coaching matches your real situation.
                </p>
              </div>
              <Field label="I identify most as" error={errors.persona?.message}>
                <div className="flex flex-wrap gap-2">
                  {PERSONA_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setValue('persona', o.value)}
                      className={cn(
                        'rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors',
                        persona === o.value
                          ? 'bg-primary text-white border-primary'
                          : 'border-default-200 bg-default-50/80 text-default-600 hover:border-primary-300'
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Preferred language">
                <div className="flex gap-2">
                  {(['en', 'es'] as const).map((lang) => (
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

            <section className="clay-card p-6 space-y-5 xl:col-span-7">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Cash Flow
                </div>
                <h2 className="text-2xl font-bold">Income</h2>
                <p className="text-sm text-default-500">
                  Keep your monthly picture current so plans and suggestions stay realistic.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <MoneyInput
                  label="Monthly income (after taxes)"
                  placeholder="2200"
                  error={errors.income_monthly?.message}
                  {...register('income_monthly')}
                />
                <MoneyInput
                  label="Current savings balance"
                  placeholder="0"
                  error={errors.savings_balance?.message}
                  {...register('savings_balance')}
                />
              </div>
              <Field label="Income pattern">
                <div className="flex gap-2">
                  {(['steady', 'irregular'] as const).map((t) => (
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
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-default-200 bg-default-50/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-default-500">
                    Income
                  </div>
                  <div className="mt-2 text-xl font-bold">
                    {formatMoney(Number(incomeMonthly) || 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-default-200 bg-default-50/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-default-500">
                    Expenses
                  </div>
                  <div className="mt-2 text-xl font-bold">{formatMoney(totalExpenses)}</div>
                </div>
                <div className="rounded-2xl border border-default-200 bg-default-50/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-default-500">
                    Left This Month
                  </div>
                  <div className="mt-2 text-xl font-bold text-emerald-400">
                    {formatMoney(monthlyLeft)}
                  </div>
                </div>
              </div>
            </section>

            <section className="clay-card p-6 space-y-5 xl:col-span-7">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
                    Spending
                  </div>
                  <h2 className="text-2xl font-bold">Monthly Expenses</h2>
                  <p className="text-sm text-default-500">
                    List the bills and categories that shape your month-to-month budget.
                  </p>
                </div>
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
              <div className="space-y-3">
                {expenseFields.map((field, i) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[minmax(0,1fr)_160px_auto] gap-3 items-start rounded-2xl border border-default-200 bg-default-50/70 p-3"
                  >
                    <div>
                      <input
                        placeholder="Category (e.g. rent)"
                        className="clay-input w-full rounded-xl border border-default-200 bg-default-50 px-3 py-2.5 text-sm outline-none focus:border-primary-400"
                        {...register(`expenses.${i}.key`)}
                      />
                      {errors.expenses?.[i]?.key && (
                        <p className="text-danger text-xs mt-1">
                          {errors.expenses[i].key?.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-2.5">
                      <span className="text-default-500 text-sm">$</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-transparent text-sm outline-none"
                        {...register(`expenses.${i}.value`)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExpense(i)}
                      className="mt-1 rounded-xl p-2 text-danger hover:bg-danger-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              {expenseFields.length === 0 && (
                <div className="rounded-2xl border border-dashed border-default-200 bg-default-50/50 p-6 text-sm text-default-400">
                  No expenses added yet. Add rent, food, transport, subscriptions, and anything else
                  that hits monthly.
                </div>
              )}
            </section>

            <section className="clay-card p-6 space-y-5 xl:col-span-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">
                    Obligations
                  </div>
                  <h2 className="text-2xl font-bold">Debts</h2>
                  <p className="text-sm text-default-500">
                    Track balances and rates so payoff suggestions are based on reality.
                  </p>
                </div>
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
              <div className="rounded-2xl border border-default-200 bg-default-50/70 p-4">
                <div className="mb-1 flex items-center gap-2 text-default-500">
                  <CreditCard size={15} />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    Total Debt
                  </span>
                </div>
                <div className="text-2xl font-bold">{formatMoney(totalDebt)}</div>
              </div>
              {debtFields.map((field, i) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_100px_80px_auto] gap-2 items-start rounded-2xl border border-default-200 bg-default-50/70 p-3"
                >
                  <input
                    placeholder="Type (e.g. credit card)"
                    className="clay-input rounded-xl border border-default-200 bg-default-50 px-3 py-2.5 text-sm outline-none focus:border-primary-400"
                    {...register(`debts.${i}.type`)}
                  />
                  <div className="flex items-center gap-1 rounded-xl border border-default-200 bg-default-50 px-2 py-2.5">
                    <span className="text-default-500 text-xs">$</span>
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-full bg-transparent text-sm outline-none"
                      {...register(`debts.${i}.amount`)}
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border border-default-200 bg-default-50 px-2 py-2.5">
                    <input
                      type="number"
                      placeholder="Rate"
                      className="w-full bg-transparent text-sm outline-none"
                      {...register(`debts.${i}.rate`)}
                    />
                    <span className="text-default-500 text-xs">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDebt(i)}
                    className="rounded-xl p-2 text-danger hover:bg-danger-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {debtFields.length === 0 && (
                <div className="rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-default-300">
                  No debts recorded. That gives you more room to build savings and hit your goals
                  faster.
                </div>
              )}
            </section>

            <section className="clay-card p-6 space-y-5 xl:col-span-12">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                    Future Plans
                  </div>
                  <h2 className="text-2xl font-bold">Goals</h2>
                  <p className="text-sm text-default-500">
                    Track what you are saving toward so Vela can keep your plan aligned with it.
                  </p>
                </div>
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
              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-default-200 bg-default-50/70 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-default-500">
                    Goal Target Total
                  </div>
                  <div className="mt-2 text-3xl font-bold">{formatMoney(totalGoalTarget)}</div>
                  <div className="mt-2 text-sm text-default-500">
                    {goals.length} goal{goals.length === 1 ? '' : 's'} tracked
                  </div>
                </div>
                <div className="space-y-3">
                  {goalFields.map((field, i) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[minmax(0,1fr)_130px_170px_auto] gap-3 items-start rounded-2xl border border-default-200 bg-default-50/70 p-3"
                    >
                      <input
                        placeholder="Goal (e.g. emergency fund)"
                        className="clay-input rounded-xl border border-default-200 bg-default-50 px-3 py-2.5 text-sm outline-none focus:border-primary-400"
                        {...register(`goals.${i}.label`)}
                      />
                      <div className="flex items-center gap-1 rounded-xl border border-default-200 bg-default-50 px-2 py-2.5">
                        <span className="text-default-500 text-xs">$</span>
                        <input
                          type="number"
                          placeholder="Amount"
                          className="w-full bg-transparent text-sm outline-none"
                          {...register(`goals.${i}.target_amount`)}
                        />
                      </div>
                      <input
                        type="date"
                        className="clay-input rounded-xl border border-default-200 bg-default-50 px-3 py-2.5 text-sm outline-none focus:border-primary-400"
                        {...register(`goals.${i}.target_date`)}
                      />
                      <button
                        type="button"
                        onClick={() => removeGoal(i)}
                        className="rounded-xl p-2 text-danger hover:bg-danger-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {goalFields.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-sky-500/20 bg-sky-500/5 p-6 text-sm text-default-300">
                      No goals yet. Add something concrete like an emergency fund, tuition payment,
                      or travel target.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

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
