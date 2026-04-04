import type { ProfileSnapshotProps } from '@/types/components'

const PERSONA_LABELS: Record<string, string> = {
  gig_worker: 'Gig Worker', student: 'Student', immigrant: 'Immigrant',
  retiree: 'Retiree', single_parent: 'Single Parent', other: 'Individual',
}

const HEALTH_TEXT_COLOR: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function ProfileSnapshot({ persona, health_score, income_monthly, gaps }: ProfileSnapshotProps) {
  const color = health_score >= 70 ? 'success' : health_score >= 40 ? 'warning' : 'danger'
  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-default-400 uppercase tracking-wide">Your profile</p>
          <h3 className="font-bold text-lg">{PERSONA_LABELS[persona]}</h3>
        </div>
        <div className="text-center">
          <p className={`text-3xl font-extrabold ${HEALTH_TEXT_COLOR[color]}`}>{health_score}</p>
          <p className="text-xs text-default-400">/ 100</p>
        </div>
      </div>
      <p className="text-sm text-default-600">Income: <strong>${income_monthly.toLocaleString()}/mo</strong></p>
      {gaps.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-default-500 uppercase">To improve your score</p>
          {gaps.map((gap, i) => (
            <div key={i} className="clay-card p-3 flex flex-col gap-0.5">
              <p className="text-sm font-medium">{gap.label}</p>
              <p className="text-xs text-default-500">{gap.prompt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
