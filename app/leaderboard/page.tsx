'use client'
import { useEffect, useState } from 'react'
import { AppNav } from '@/components/app-nav'
import { Trophy } from 'lucide-react'
import type { DbLeaderboardEntry } from '@/types/database'

const MEDAL = ['🥇', '🥈', '🥉']

const XP_BADGE = (xp: number) =>
  xp >= 500
    ? { label: 'Legend', color: 'text-yellow-600 bg-yellow-50' }
    : xp >= 200
      ? { label: 'Pro', color: 'text-purple-600 bg-purple-50' }
      : xp >= 100
        ? { label: 'Rising', color: 'text-blue-600 bg-blue-50' }
        : { label: 'Beginner', color: 'text-default-500 bg-default-100' }

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<DbLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data: DbLeaderboardEntry[]) => setEntries(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden">
      <AppNav />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Trophy size={22} className="text-warning-500" />
            <div>
              <h1 className="text-2xl font-bold">Leaderboard</h1>
              <p className="text-default-500 text-sm mt-0.5">
                Top players ranked by XP earned across all games.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="clay-card p-6 text-center text-default-400 text-sm">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="clay-card p-8 text-center">
              <p className="font-semibold text-default-600">No scores yet</p>
              <p className="text-default-400 text-sm mt-1">
                Play a game to appear on the leaderboard!
              </p>
            </div>
          ) : (
            <div className="clay-card rounded-2xl overflow-hidden">
              <ul className="divide-y divide-divider">
                {entries.map((entry) => {
                  const badge = XP_BADGE(entry.total_xp)
                  return (
                    <li key={entry.rank} className="flex items-center gap-4 px-5 py-4">
                      <span className="text-2xl w-8 text-center shrink-0">
                        {MEDAL[entry.rank - 1] ?? (
                          <span className="text-sm font-bold text-default-400">#{entry.rank}</span>
                        )}
                      </span>
                      <span className="flex-1 font-semibold text-sm truncate">
                        {entry.display_name}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-sm font-bold text-warning-600 shrink-0 min-w-[60px] text-right">
                        {entry.total_xp} XP
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
