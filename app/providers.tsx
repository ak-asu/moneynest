'use client'

import type { ThemeProviderProps } from 'next-themes'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { MusicProvider } from '@/components/audio/music-manager'

export interface ProvidersProps {
  children: React.ReactNode
  themeProps?: ThemeProviderProps
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <NextThemesProvider {...themeProps}>
      <MusicProvider>{children}</MusicProvider>
    </NextThemesProvider>
  )
}
