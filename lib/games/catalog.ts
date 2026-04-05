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
    id: 'catalog-tradeoff-slider',
    game_type: 'tradeoff_slider',
    title: 'Savings vs. Spending Tradeoff',
    instructions: 'Find the right balance between enjoying life now and saving for the future.',
    income: 3000,
    categories: [
      { name: 'Needs', suggested: 1200, min: 900, max: 1500 },
      { name: 'Wants', suggested: 600, min: 200, max: 900 },
      { name: 'Savings', suggested: 600, min: 400, max: 900 },
      { name: 'Debt Payoff', suggested: 400, min: 200, max: 700 },
      { name: 'Emergency Fund', suggested: 200, min: 100, max: 400 },
    ],
    win_condition: "Perfect balance! You've allocated well across needs, wants, and future goals.",
  },
  {
    id: 'catalog-insurance-card-game',
    game_type: 'insurance_card_game',
    title: 'Insurance Card Game',
    instructions: 'Match insurance policies to their descriptions and benefits.',
    income: 0,
    categories: [],
    win_condition: 'Great job matching all the insurance cards!',
  },
  {
    id: 'catalog-credit-quest-game',
    game_type: 'credit_quest_game',
    title: 'Credit Quest',
    instructions: 'Navigate the world of credit and learn how to build a good credit score.',
    income: 0,
    categories: [],
    win_condition: "You've mastered the art of credit management!",
  },
  {
    id: 'catalog-term-match',
    game_type: 'term_match',
    title: 'Financial Term Match',
    instructions: 'Match financial terms to their correct definitions.',
    income: 0,
    categories: [],
    win_condition: 'Excellent! You know your financial terms.',
  },
  {
    id: 'catalog-fin-word',
    game_type: 'fin_word',
    title: 'FinWord Challenge',
    instructions: 'Unscramble the letters to form financial terms.',
    income: 0,
    categories: [],
    win_condition: "Fantastic! You've unscrambled all the financial terms.",
  },
  {
    id: 'catalog-wealth-farm',
    game_type: 'wealth_farm',
    title: 'Wealth Farm',
    instructions: 'Plant and grow your financial knowledge to harvest wealth.',
    income: 0,
    categories: [],
    win_condition: 'Congratulations! Your wealth farm is thriving.',
  },
]
