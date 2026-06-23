'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    router.push('/list')
  }

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Logo */}
        <div className="text-center">
          <span
            className="text-2xl font-bold tracking-tight text-ink"
            style={{ fontFamily: 'var(--font-header)' }}
          >
            Listly AI
          </span>
          <p className="text-muted text-sm mt-1">Welcome back</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-line p-6 flex flex-col gap-5 shadow-sm">

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink uppercase tracking-wider">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 rounded-xl border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:border-accent transition-colors placeholder:text-muted"
                style={{ '--tw-ring-color': '#00C47A' } as React.CSSProperties}
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink uppercase tracking-wider">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 rounded-xl border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:border-accent transition-colors placeholder:text-muted"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{
              minHeight: 48,
              background: loading || !email || !password ? '#E5E7EB' : '#1E2022',
              color: loading || !email || !password ? '#6B7280' : '#FFFFFF',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <p className="text-center text-sm text-muted">
          No account?{' '}
          <Link href="/signup" className="text-ink font-medium hover:underline">Sign up free</Link>
        </p>
        <p className="text-center text-sm text-muted">
          <Link href="/auth/reset" className="text-muted hover:text-ink hover:underline">Forgot password?</Link>
        </p>
      </div>
    </div>
  )
}
