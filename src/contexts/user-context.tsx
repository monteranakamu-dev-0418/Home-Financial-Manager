'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@/types'

type UserContextType = {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('current_user')
    if (stored) {
      setCurrentUserState(JSON.parse(stored))
    }
  }, [])

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user)
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('current_user')
    }
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
