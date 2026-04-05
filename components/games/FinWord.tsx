'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import { cn } from '@/lib/utils/cn'
import { useVoice } from '@/lib/hooks/useVoice'
import styles from './finword.module.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const spaceMono    = Space_Mono({ subsets: ['latin'], weight: ['400', '700'] })

// Mix of 4, 5, and 6-letter financial words — teen-friendly language
const WORDS = [
  // 4-letter
  { word: 'SAVE', def: 'Putting money aside now so you have it when you actually need it.' },
  { word: 'CASH', def: 'Actual money in hand or in your bank account — liquid and ready to use.' },
  { word: 'LOAN', def: 'Money someone lends you that you promise to pay back — usually with extra on top.' },
  { word: 'DEBT', def: 'Money you owe. The longer you take to pay it off, the more it usually costs.' },
  { word: 'EARN', def: 'Money coming in — from a job, a side hustle, selling something, or investments.' },
  { word: 'RISK', def: 'The chance something goes wrong with your money, investment, or property.' },
  // 5-letter
  { word: 'ASSET', def: 'Anything you own that has value — cash, car, house, investments.' },
  { word: 'CLAIM', def: 'A request you make to your insurance company after something goes wrong.' },
  { word: 'YIELD', def: 'How much return an investment gives you — usually shown as a percentage per year.' },
  { word: 'AGENT', def: 'A licensed person who sells and manages insurance policies on your behalf.' },
  { word: 'SPEND', def: 'Using money to buy something. The opposite of saving — not always a bad thing.' },
  { word: 'TRUST', def: 'A legal arrangement where someone manages money or assets for another person.' },
  { word: 'DEBIT', def: 'A card that spends money you already have — directly from your bank account.' },
  // 6-letter
  { word: 'BUDGET', def: 'A plan for how you\'ll spend your money — so you stay in control, not your bank account.' },
  { word: 'CREDIT', def: 'Money you borrow now and pay back later. Good credit history = lower rates on everything.' },
  { word: 'INVEST', def: 'Putting money to work so it grows over time — stocks, funds, real estate.' },
  { word: 'INCOME', def: 'All the money coming in — wages, tips, interest, freelance, side hustle revenue.' },
  { word: 'EQUITY', def: 'What you actually own after subtracting debt. House worth $300K with $200K mortgage = $100K equity.' },
  { word: 'POLICY', def: 'A written agreement between you and an insurance company. Always read the fine print.' },
  { word: 'INSURE', def: 'To protect yourself from financial loss by paying into a plan that covers the unexpected.' },
  { word: 'REFUND', def: 'Money returned to you — from overpaid taxes, a returned item, or a cancelled subscription.' },
]

const KEY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
]

type TileResult = 'correct' | 'present' | 'absent'
type TileState  = { letter: string; result: TileResult | null; revealed: boolean; hinted: boolean }

function emptyBoard(len: number): TileState[][] {
  return Array.from({ length: len + 2 }, () =>
    Array.from({ length: len }, () => ({ letter: '', result: null, revealed: false, hinted: false }))
  )
}

function scoreGuess(guess: string, word: string): TileResult[] {
  const result  = Array<TileResult>(guess.length).fill('absent')
  const wordArr = word.split('')
  const used    = Array(word.length).fill(false)
  guess.split('').forEach((ch, i) => {
    if (ch === wordArr[i]) { result[i] = 'correct'; used[i] = true }
  })
  guess.split('').forEach((ch, i) => {
    if (result[i] === 'correct') return
    const j = wordArr.findIndex((wch, wi) => wch === ch && !used[wi])
    if (j !== -1) { result[i] = 'present'; used[j] = true }
  })
  return result
}

export function FinWord() {
  const { speak } = useVoice()

  const [wordOrder] = useState<number[]>(() => {
    const arr = [...Array(WORDS.length).keys()]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  })
  const [wordIdx, setWordIdx]           = useState(0)
  const [board, setBoard]               = useState<TileState[][]>(() => emptyBoard(WORDS[wordOrder[0]].word.length))
  const [currentRow, setCurrentRow]     = useState(0)
  const [currentGuess, setCurrentGuess] = useState<string[]>([])
  const [gameOver, setGameOver]         = useState(false)
  const [keyStates, setKeyStates]       = useState<Record<string, TileResult>>({})
  const [xp, setXp]                     = useState(0)
  const [streak, setStreak]             = useState(0)
  const [hintUsed, setHintUsed]         = useState(false)
  const [revealedHint, setRevealedHint] = useState(-1)
  const [msg, setMsg]                   = useState<{ text: string; type: 'info' | 'error' | 'success' }>({ text: '', type: 'info' })
  const [hintText, setHintText]         = useState('Need a hint? Reveal a letter — costs 50 XP.')
  const [shakingRow, setShakingRow]     = useState<number | null>(null)
  const [modal, setModal]               = useState<{ visible: boolean; won: boolean; earned: number; row: number }>({
    visible: false, won: false, earned: 0, row: 0,
  })

  const entry   = WORDS[wordOrder[wordIdx % WORDS.length]]
  const word    = entry.word
  const wordLen = word.length
  const maxRows = wordLen + 2
  const tileSize   = Math.min(64, Math.floor(340 / wordLen))
  const tileFontSz = Math.min(24, Math.floor(220 / wordLen))

  const boardRef = useRef(board)
  boardRef.current = board

  function setMessage(text: string, type: 'info' | 'error' | 'success') {
    setMsg({ text, type })
  }

  function updateKeyState(letter: string, result: TileResult) {
    const priority: Record<TileResult, number> = { correct: 3, present: 2, absent: 1 }
    setKeyStates(prev => {
      const cur = prev[letter]
      if (!cur || priority[result] > priority[cur]) return { ...prev, [letter]: result }
      return prev
    })
  }

  function revealRow(row: number, guess: string, results: TileResult[]) {
    results.forEach((r, i) => {
      setTimeout(() => {
        setBoard(prev => {
          const next = prev.map(r2 => r2.map(t => ({ ...t })))
          next[row][i] = { ...next[row][i], result: r, revealed: true }
          return next
        })
        updateKeyState(guess[i], r)
      }, i * 120)
    })
  }

  const submitGuess = useCallback(() => {
    if (gameOver) return
    if (currentGuess.length < wordLen) {
      setMessage('Not enough letters!', 'error')
      setShakingRow(currentRow)
      setTimeout(() => setShakingRow(null), 400)
      return
    }
    const guessStr = currentGuess.join('')
    const results  = scoreGuess(guessStr, word)
    revealRow(currentRow, guessStr, results)

    if (guessStr === word) {
      setGameOver(true)
      const newStreak   = streak + 1
      const baseEarned  = Math.max(50, 200 - currentRow * 25) - (hintUsed ? 50 : 0)
      const streakBonus = 10 * Math.min(newStreak, 4)
      const earned      = baseEarned + streakBonus
      setXp(x => x + earned)
      setStreak(newStreak)
      setTimeout(() => {
        setModal({ visible: true, won: true, earned, row: currentRow })
        speak(`${word}. ${entry.def}`)
      }, 1800)
      return
    }
    const nextRow = currentRow + 1
    setCurrentRow(nextRow)
    setCurrentGuess([])
    if (nextRow >= maxRows) {
      setGameOver(true)
      setStreak(0)
      setMessage(word, 'error')
      setTimeout(() => {
        setModal({ visible: true, won: false, earned: 0, row: maxRows - 1 })
        speak(`The word was ${word}. ${entry.def}`)
      }, 1200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, currentGuess, wordLen, word, currentRow, hintUsed, maxRows, entry.def, streak])

  const handleKey = useCallback((k: string) => {
    if (gameOver) return
    if (k === '⌫' || k === 'BACKSPACE') {
      if (currentGuess.length > 0) {
        const col = currentGuess.length - 1
        setCurrentGuess(g => g.slice(0, -1))
        setBoard(prev => {
          const next = prev.map(r => r.map(t => ({ ...t })))
          next[currentRow][col] = { ...next[currentRow][col], letter: '' }
          return next
        })
      }
    } else if (k === 'ENTER') {
      submitGuess()
    } else if (/^[A-Z]$/.test(k) && currentGuess.length < wordLen) {
      const col = currentGuess.length
      setCurrentGuess(g => [...g, k])
      setBoard(prev => {
        const next = prev.map(r => r.map(t => ({ ...t })))
        next[currentRow][col] = { ...next[currentRow][col], letter: k }
        return next
      })
    }
  }, [gameOver, currentGuess, wordLen, currentRow, submitGuess])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toUpperCase()
      if (k === 'BACKSPACE') handleKey('⌫')
      else if (k === 'ENTER') handleKey('ENTER')
      else if (/^[A-Z]$/.test(k)) handleKey(k)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleKey])

  function useHint() {
    if (xp < 50)  { setMessage('Not enough XP for a hint!', 'error'); return }
    if (hintUsed) { setMessage('Hint already used this round!', 'error'); return }
    if (gameOver) return
    const pos = board[currentRow].findIndex((_, i) => currentGuess[i] !== word[i])
    if (pos === -1) return
    setRevealedHint(pos)
    setHintUsed(true)
    setXp(x => x - 50)
    const letter = word[pos]
    setCurrentGuess(g => {
      const next = [...g]
      while (next.length <= pos) next.push('')
      next[pos] = letter
      return next
    })
    setBoard(prev => {
      const next = prev.map(r => r.map(t => ({ ...t })))
      next[currentRow][pos] = { ...next[currentRow][pos], letter, hinted: true }
      return next
    })
    setHintText(`Letter ${pos + 1} is "${letter}" — now guess the rest!`)
  }

  function nextWord() {
    const next    = (wordIdx + 1) % WORDS.length
    const newWord = WORDS[wordOrder[next]].word
    setWordIdx(next)
    setBoard(emptyBoard(newWord.length))
    setCurrentRow(0); setCurrentGuess([]); setGameOver(false)
    setKeyStates({}); setHintUsed(false); setRevealedHint(-1)
    setMsg({ text: '', type: 'info' })
    setHintText('Need a hint? Reveal a letter — costs 50 XP.')
    setModal(m => ({ ...m, visible: false }))
  }

  const msgColor = { info: 'text-default-400', error: 'text-red-400', success: 'text-emerald-400' }[msg.type]
  const modalEmojis = ['🎉','🔥','💡','⭐','🏆']
  const modalTitles = ['Genius!','Magnificent!','Impressive!','Splendid!','Great!','Phew!']

  return (
    <div className={cn('min-h-screen flex flex-col bg-background', spaceGrotesk.className)}>

      {/* HEADER — full width */}
      <header className="w-full px-6 py-2.5 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <span className={cn('text-sm font-bold text-foreground', spaceMono.className)}>FinWord</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-xs text-default-500">finance word puzzle</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className={cn('clay-card px-3 py-1 text-xs', spaceMono.className)}>
            🔥 <b className="text-foreground">{streak}</b> streak
          </div>
          <div className={cn('clay-card px-3 py-1 text-xs', spaceMono.className)}>
            ⭐ <b className="text-foreground">{xp}</b> XP
          </div>
        </div>
      </header>

      {/* TWO-COLUMN LAYOUT */}
      <div className="flex-1 grid grid-cols-[1fr_360px]">

        {/* LEFT — board, centered */}
        <div className="flex flex-col items-center border-r border-white/10 px-8 py-6 gap-3">
          {/* Word length badge */}
          <div className={cn('text-xs font-semibold text-default-400 tracking-widest uppercase', spaceMono.className)}>
            {wordLen}-letter word · {maxRows} attempts
          </div>

          {/* Message */}
          <div className={cn('h-5 text-sm font-semibold tracking-wide transition-all', msgColor)}>
            {msg.text}
          </div>

          {/* Board */}
          <div className="flex flex-col gap-1.5">
            {board.map((row, ri) => (
              <div key={ri} className={cn('flex gap-1.5', ri === shakingRow && styles.shake)}>
                {row.map((tile, ci) => {
                  const isActive = ri === currentRow && !gameOver
                  const letter   = isActive ? (currentGuess[ci] ?? '') : tile.letter
                  const hinted   = isActive && ci === revealedHint
                  return (
                    <div
                      key={ci}
                      style={{ width: tileSize, height: tileSize, fontSize: tileFontSz }}
                      className={cn(
                        'flex items-center justify-center rounded-xl border-2 font-bold uppercase select-none transition-colors',
                        spaceMono.className,
                        !tile.revealed && !tile.result && (letter ? 'clay-card border-white/30' : 'border-white/10 bg-white/5'),
                        letter && !tile.revealed && styles.pop,
                        hinted && 'border-amber-400/60 text-amber-400',
                        tile.revealed && tile.result === 'correct' && cn('border-emerald-500 bg-emerald-900/60 text-emerald-400', styles.reveal),
                        tile.revealed && tile.result === 'present' && cn('border-amber-500 bg-amber-900/60 text-amber-400', styles.reveal),
                        tile.revealed && tile.result === 'absent'  && cn('border-white/10 bg-white/10 text-white/40', styles.reveal),
                      )}
                    >
                      {letter}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div className="flex flex-col gap-5 p-6 overflow-y-auto">

          {/* Hint panel */}
          <div className="clay-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <span className="text-xs font-bold text-default-400 uppercase tracking-widest">Hint</span>
            </div>
            <p className="text-sm text-default-400 leading-relaxed mb-3">{hintText}</p>
            <button
              onClick={useHint}
              className="w-full clay-card py-2 text-sm text-default-400 hover:border-red-500/50 hover:text-red-400 transition-colors font-semibold"
            >
              Reveal a letter <span className="text-amber-400">−50 XP</span>
            </button>
          </div>

          {/* Keyboard */}
          <div>
            <div className="text-xs font-bold text-default-400 uppercase tracking-widest mb-3">Letters used</div>
            <div className="flex flex-col gap-1.5">
              {KEY_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1">
                  {row.map(k => {
                    const state = keyStates[k]
                    return (
                      <button
                        key={k}
                        onClick={() => handleKey(k)}
                        className={cn(
                          'h-11 rounded-lg font-bold text-xs uppercase cursor-pointer select-none transition-all flex items-center justify-center',
                          k.length > 1 ? 'min-w-[46px] flex-[1.5] max-w-[58px] text-[10px]' : 'min-w-[26px] flex-1 max-w-[36px]',
                          !state && 'clay-card text-foreground hover:shadow-md',
                          state === 'correct' && 'bg-emerald-900/80 border border-emerald-500 text-emerald-400',
                          state === 'present' && 'bg-amber-900/80 border border-amber-500 text-amber-400',
                          state === 'absent'  && 'bg-white/5 border border-white/10 text-white/30',
                        )}
                      >
                        {k}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Word count */}
          <div className="clay-card p-3 text-center">
            <div className="text-xs text-default-500">Word</div>
            <div className={cn('text-2xl font-bold text-foreground', spaceMono.className)}>
              {wordIdx + 1} <span className="text-default-400 text-base font-normal">/ {WORDS.length}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="clay-card p-4 flex flex-col gap-2.5">
            <div className="text-xs font-bold text-default-400 uppercase tracking-widest mb-1">Color guide</div>
            {[
              { bg: 'bg-emerald-900/60', border: 'border-emerald-500', text: 'Correct position' },
              { bg: 'bg-amber-900/60',   border: 'border-amber-500',   text: 'Wrong position' },
              { bg: 'bg-white/10',       border: 'border-white/10',    text: 'Not in word' },
            ].map(l => (
              <div key={l.text} className="flex items-center gap-3 text-sm text-default-400">
                <div className={cn('w-5 h-5 rounded border-2 shrink-0', l.bg, l.border)} />
                {l.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="clay-card p-8 w-full max-w-lg">
            <div className="flex items-start gap-6">
              {/* Left: emoji + XP */}
              <div className="text-center shrink-0">
                <div className="text-6xl mb-2">
                  {modal.won ? modalEmojis[Math.min(maxRows - 1 - modal.row, 4)] : '😔'}
                </div>
                {modal.won && (
                  <div className="text-2xl font-bold text-emerald-400">
                    +<span className={styles.xpPop}>{modal.earned}</span>
                    <div className="text-xs font-normal text-default-400">XP earned</div>
                  </div>
                )}
              </div>
              {/* Right: content */}
              <div className="flex-1">
                <div className={cn('text-2xl font-bold text-foreground mb-1', spaceMono.className)}>
                  {modal.won ? modalTitles[Math.min(modal.row, modalTitles.length - 1)] : 'Better luck next time!'}
                </div>
                <div className={cn('text-3xl text-red-500 tracking-[6px] mb-3', spaceMono.className)}>{word}</div>
                <p className="text-sm text-default-400 leading-relaxed mb-4">{entry.def}</p>
                <button
                  onClick={nextWord}
                  className="clay-btn w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all text-base"
                >
                  Next word →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
