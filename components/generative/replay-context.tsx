'use client'
import { createContext, useContext, type ReactNode } from 'react'

const ReplayContext = createContext(false)

export const useIsReplay = () => useContext(ReplayContext)

export function ReplayProvider({ isReplay, children }: { isReplay: boolean; children: ReactNode }) {
  return <ReplayContext.Provider value={isReplay}>{children}</ReplayContext.Provider>
}
