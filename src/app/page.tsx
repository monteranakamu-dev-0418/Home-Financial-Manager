'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/user-context'
import type { User } from '@/types'

export default function SelectUserPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { setCurrentUser } = useUser()
  const router = useRouter()

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .order('created_at')
      .then(({ data }) => {
        if (data) setUsers(data)
        setLoading(false)
      })
  }, [])

  const handleSelect = (user: User) => {
    setCurrentUser(user)
    router.push('/home')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">家計管理</h1>
        <p className="text-center text-gray-500 mb-10">どちらですか？</p>

        {loading ? (
          <div className="text-center text-gray-400">読み込み中...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                className="w-full py-5 text-xl font-semibold rounded-2xl bg-white border-2 border-gray-200 text-gray-800 shadow-sm active:scale-95 transition-transform hover:border-blue-400 hover:text-blue-600"
              >
                {user.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
