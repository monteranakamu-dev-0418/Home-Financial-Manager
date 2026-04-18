'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Mode = 'normal' | 'kawaii'

interface ModeContextValue {
  mode: Mode
  toggleMode: () => void
}

const ModeContext = createContext<ModeContextValue>({
  mode: 'normal',
  toggleMode: () => {},
})

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('normal')

  useEffect(() => {
    const stored = localStorage.getItem('app_mode') as Mode | null
    if (stored === 'kawaii' || stored === 'normal') setMode(stored)
  }, [])

  useEffect(() => {
    localStorage.setItem('app_mode', mode)
    document.documentElement.classList.toggle('kawaii', mode === 'kawaii')
  }, [mode])

  const toggleMode = () => setMode(m => m === 'normal' ? 'kawaii' : 'normal')

  return (
    <ModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  )
}

export const useMode = () => useContext(ModeContext)
