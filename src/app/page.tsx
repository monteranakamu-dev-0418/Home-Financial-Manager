'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/user-context'
import { useMode } from '@/contexts/mode-context'
import type { User } from '@/types'

const USER_AVATARS: Record<string, string> = {
  '中村': '🌸',
  '寺本': '🌟',
}

const DEFAULT_AVATARS = ['🍀', '🌈', '🦋', '🌺']

function getAvatar(name: string, index: number) {
  return USER_AVATARS[name] ?? DEFAULT_AVATARS[index % DEFAULT_AVATARS.length]
}

export default function SelectUserPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { setCurrentUser } = useUser()
  const { mode, toggleMode } = useMode()
  const router = useRouter()
  const isKawaii = mode === 'kawaii'

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

  if (!isKawaii) {
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

          <button
            onClick={toggleMode}
            className="mt-10 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✨ きゅるるんモードに切り替え
          </button>
        </div>
      </div>
    )
  }

  // ===== きゅるるんモード =====
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #f3e5f5 40%, #e8f5e9 100%)' }}>

      {/* 背景デコレーション */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        <span className="absolute top-8 left-6 text-3xl opacity-30 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>🌸</span>
        <span className="absolute top-16 right-8 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>⭐</span>
        <span className="absolute top-32 left-16 text-xl opacity-20 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>💕</span>
        <span className="absolute bottom-32 right-6 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '3.2s' }}>🌈</span>
        <span className="absolute bottom-48 left-8 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '3.8s' }}>✨</span>
        <span className="absolute bottom-20 left-1/2 text-xl opacity-15 animate-bounce" style={{ animationDelay: '1.2s', animationDuration: '4.2s' }}>🦋</span>
        <span className="absolute top-1/2 right-4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '3.6s' }}>🌟</span>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* タイトル */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#c2185b', fontFamily: 'var(--font-zen-maru), sans-serif' }}>
            おうち家計簿
          </h1>
          <p className="text-sm font-medium" style={{ color: '#ad1457' }}>
            ✨ だれが使うの？ ✨
          </p>
        </div>

        {/* ユーザーボタン */}
        {loading ? (
          <div className="text-center text-pink-400 text-lg">よみこみちゅう…💭</div>
        ) : (
          <div className="flex flex-col gap-5">
            {users.map((user, i) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                className="w-full active:scale-95 transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #fff0f6 0%, #fce4ec 50%, #f8bbd0 100%)',
                  border: '2.5px solid #f48fb1',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  boxShadow: '0 6px 20px rgba(233, 30, 99, 0.15), 0 2px 6px rgba(233, 30, 99, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  className="flex items-center justify-center text-3xl rounded-full flex-shrink-0"
                  style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
                    border: '2px solid #f48fb1',
                    boxShadow: '0 2px 8px rgba(233, 30, 99, 0.20)',
                  }}
                >
                  {getAvatar(user.name, i)}
                </div>
                <div className="text-left flex-1">
                  <div className="text-xl font-bold" style={{ color: '#880e4f', fontFamily: 'var(--font-zen-maru), sans-serif' }}>
                    {user.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#ad1457' }}>
                    タップしてスタート！
                  </div>
                </div>
                <span className="text-xl" style={{ color: '#f48fb1' }}>→</span>
              </button>
            ))}
          </div>
        )}

        {/* モード切替 */}
        <button
          onClick={toggleMode}
          className="mt-10 w-full py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.7)',
            border: '1.5px solid #f48fb1',
            color: '#ad1457',
            backdropFilter: 'blur(8px)',
          }}
        >
          🔄 ふつうモードにもどる
        </button>
      </div>
    </div>
  )
}
