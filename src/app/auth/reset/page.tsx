'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStatus('sent')
  }

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-8">

        <div className="text-center">
          <span className="text-2xl font-bold tracking-tight text-ink" style={{ fontFamily: 'var(--font-header)' }}>
            Listly AI
          </span>
          <p className="text-muted text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-card rounded-2xl border border-line p-6 flex flex-col gap-5 shadow-sm">
          {status === 'sent' ? (
            <div className="text-center flex flex-col gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: '#F0FDF4' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C47A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <p className="font-semibold text-ink">Check your inbox</p>
              <p className="text-muted text-sm">We sent a reset link to <span className="text-ink font-medium">{email}</span>.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  className="w-full px-4 py-3 rounded-xl border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:border-accent transition-colors placeholder:text-muted"
                  autoComplete="email"
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={handleReset}
                disabled={loading || !email}
                className="w-full rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{ minHeight: 48, background: !email || loading ? '#E5E7EB' : '#1E2022', color: !email || loading ? '#6B7280' : '#FFFFFF' }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted">
          <Link href="/login" className="text-ink font-medium hover:underline">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
