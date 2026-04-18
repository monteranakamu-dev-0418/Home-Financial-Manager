'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/user-context'
import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser()
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('current_user')
    if (!stored) {
      router.replace('/')
    }
  }, [currentUser, router])

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-16 max-w-lg mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
