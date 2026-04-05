'use client'
import { cn } from '@/lib/utils/cn'
import type { PersonaType } from '@/types/database'

const PERSONAS: Array<{ value: PersonaType; label: string; emoji: string; description: string }> = [
  {
    value: 'gig_worker',
    label: 'Gig Worker',
    emoji: '🚗',
    description: 'Uber, DoorDash, freelance — irregular income',
  },
  {
    value: 'student',
    label: 'Student',
    emoji: '🎓',
    description: 'College or recent grad, starting out',
  },
  {
    value: 'immigrant',
    label: 'New to the US',
    emoji: '🌎',
    description: 'Navigating a new financial system',
  },
  {
    value: 'single_parent',
    label: 'Single Parent',
    emoji: '👨‍👧',
    description: 'Managing a household solo',
  },
  {
    value: 'retiree',
    label: 'Retiree',
    emoji: '🏡',
    description: 'Fixed income, long-term planning',
  },
  {
    value: 'other',
    label: 'Other',
    emoji: '👤',
    description: "Something else — we'll adapt to you",
  },
]

interface PersonaSelectorProps {
  value: PersonaType | null
  onChange: (p: PersonaType) => void
}

export function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {PERSONAS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            'clay-card p-5 text-left flex flex-col gap-2 cursor-pointer transition-all hover:border-primary-300',
            value === p.value
              ? 'ring-2 ring-primary border-primary-400 bg-primary-50 scale-[1.02]'
              : 'hover:bg-default-50'
          )}
        >
          <span className="text-3xl">{p.emoji}</span>
          <span className="font-semibold text-sm">{p.label}</span>
          <span className="text-xs text-default-400 leading-relaxed">{p.description}</span>
        </button>
      ))}
    </div>
  )
}
