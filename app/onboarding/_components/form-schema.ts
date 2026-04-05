import { z } from 'zod'

export const onboardingSchema = z.object({
  persona: z.enum(['gig_worker', 'student', 'immigrant', 'retiree', 'single_parent', 'other']),
  language: z.enum(['en', 'es']),
  income_monthly: z.coerce.number().min(1, 'Required'),
  income_type: z.enum(['steady', 'irregular']),
  rent: z.coerce.number().min(0),
  food: z.coerce.number().min(0),
  transport: z.coerce.number().min(0),
  other_expenses: z.coerce.number().min(0),
  savings_balance: z.coerce.number().min(0),
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>
