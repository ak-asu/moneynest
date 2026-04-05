// components/health-score-ring.tsx

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface HealthScoreRingProps {
  score: number
}

export function HealthScoreRing({ score }: HealthScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const dashOffset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE
  const color = clamped >= 70 ? '#10b981' : clamped >= 40 ? '#f59e0b' : '#ef4444'
  const label = clamped >= 70 ? 'Healthy' : clamped >= 40 ? 'Building' : 'At Risk'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[120px] h-[120px] flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-default-200"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.7s ease' }}
          />
        </svg>
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-3xl font-extrabold leading-none" style={{ color }}>
            {clamped}
          </span>
          <span className="text-xs text-default-400">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color }}>
        {label}
      </p>
    </div>
  )
}
