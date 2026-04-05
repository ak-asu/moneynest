import type { MiniGameType } from '@/types/database'

export interface CatalogGame {
  id: string
  game_type: MiniGameType
  title: string
  instructions: string
  income: number
  categories: Array<{ name: string; suggested: number; min: number; max: number }>
  win_condition: string
  time_limit_seconds?: number
}

export const GAME_CATALOG: CatalogGame[] = [
  {
    id: 'catalog-allocation-puzzle',
    game_type: 'allocation_puzzle',
    title: 'Monthly Budget Puzzle',
    instructions: 'Allocate your $2,000 income across these categories to build a balanced monthly budget.',
    income: 2000,
    categories: [
      { name: 'Housing',       suggested: 700, min: 500, max: 900 },
      { name: 'Food',          suggested: 300, min: 150, max: 450 },
      { name: 'Transport',     suggested: 200, min: 100, max: 350 },
      { name: 'Savings',       suggested: 300, min: 200, max: 500 },
      { name: 'Entertainment', suggested: 150, min:  50, max: 300 },
    ],
    win_condition: 'Great balance! You have a healthy budget with savings covered.',
  },
  {
    id: 'catalog-time-pressure',
    game_type: 'time_pressure',
    title: 'Emergency Budget Challenge',
    instructions: 'Your income just dropped 20% — reallocate your spending before time runs out!',
    income: 1600,
    time_limit_seconds: 60,
    categories: [
      { name: 'Housing',   suggested: 700, min: 500, max: 800 },
      { name: 'Food',      suggested: 250, min: 150, max: 400 },
      { name: 'Transport', suggested: 150, min:  50, max: 250 },
      { name: 'Savings',   suggested: 200, min: 100, max: 350 },
      { name: 'Other',     suggested: 100, min:   0, max: 200 },
    ],
    win_condition: 'Excellent! You adapted your budget quickly under pressure.',
  },
  {
    id: 'catalog-tradeoff-slider',
    game_type: 'tradeoff_slider',
    title: 'Savings vs. Spending Tradeoff',
    instructions: 'Find the right balance between enjoying life now and saving for the future.',
    income: 3000,
    categories: [
      { name: 'Needs',          suggested: 1200, min:  900, max: 1500 },
      { name: 'Wants',          suggested:  600, min:  200, max:  900 },
      { name: 'Savings',        suggested:  600, min:  400, max:  900 },
      { name: 'Debt Payoff',    suggested:  400, min:  200, max:  700 },
      { name: 'Emergency Fund', suggested:  200, min:  100, max:  400 },
    ],
    win_condition: "Perfect balance! You've allocated well across needs, wants, and future goals.",
  },
  {
    id: 'catalog-drag-drop',
    game_type: 'drag_drop',
    title: 'First Paycheck Challenge',
    instructions: "You just got your first paycheck. Divide it wisely across your expenses.",
    income: 1200,
    categories: [
      { name: 'Rent',      suggested: 500, min: 400, max: 600 },
      { name: 'Groceries', suggested: 200, min: 100, max: 300 },
      { name: 'Phone',     suggested:  80, min:  50, max: 120 },
      { name: 'Savings',   suggested: 200, min: 100, max: 300 },
      { name: 'Fun',       suggested: 100, min:   0, max: 200 },
    ],
    win_condition: 'Well done! You managed your first paycheck like a pro.',
  },
]
