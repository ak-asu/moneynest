import { Fira_Code as FontMono, Nunito as FontSans } from 'next/font/google'

export const fontSans = FontSans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
})

export const fontMono = FontMono({
  subsets: ['latin'],
  variable: '--font-fira-code',
})
