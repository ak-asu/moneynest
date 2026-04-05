'use client'
import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import type { DbLeaderboardEntry } from '@/types/database'

const MEDAL = ['🥇', '🥈', '🥉']

interface LeaderboardProps {
  compact?: boolean
}

export function Leaderboard({ compact = false }: LeaderboardProps) {
  const [entries, setEntries] = useState<DbLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data: DbLeaderboardEntry[]) => setEntries(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const visible = compact ? entries.slice(0, 5) : entries

  return (
    <section aria-label="XP Leaderboard">
      <div>
        <Trophy size={13} className="text-warning-500 shrink-0" />
        <h2 className="font-bold text-xs text-default-600 uppercase tracking-wide">Leaderboard</h2>
      </div>
      <div className="rounded-xl border border-divider overflow-hidden bg-default-50">
        {loading ? (
          <p className="text-default-400 text-xs p-3">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-default-400 text-xs p-3">No XP yet — play a game!</p>
        ) : (
          <ul className="divide-y divide-divider">
            {visible.map((entry) => (
              <li key={entry.rank} className="flex items-center gap-2 px-3 py-2">
                <span className="w-5 text-center text-sm shrink-0">
                  {MEDAL[entry.rank - 1] ?? `#${entry.rank}`}
                </span>
                <span className="flex-1 text-xs font-semibold truncate">{entry.display_name}</span>
                <span className="text-xs font-bold text-warning-600 shrink-0">
                  {entry.total_xp}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
