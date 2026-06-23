'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [countdown, setCountdown] = useState(0)
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [resendError, setResendError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function handleResend() {
    if (!email || countdown > 0) return
    setResendStatus('idle')
    setCountdown(60)

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
          return 0
        }
        return c - 1
      })
    }, 1000)

    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      setResendStatus('error')
      setResendError(error.message)
    } else {
      setResendStatus('success')
    }
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
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-line p-6 flex flex-col gap-5 shadow-sm text-center">
          {/* Envelope icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: '#F0FDF4' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C47A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <div>
            <h1 className="font-bold text-ink text-lg" style={{ fontFamily: 'var(--font-header)' }}>
              Check your inbox
            </h1>
            <p className="text-muted text-sm mt-2 leading-relaxed">
              {email
                ? <>We sent a confirmation link to <span className="text-ink font-medium">{email}</span>. Click it to activate your account.</>
                : 'We sent you a confirmation link. Click it to activate your account.'}
            </p>
          </div>

          <button
            onClick={handleResend}
            disabled={!email || countdown > 0}
            className="w-full rounded-xl font-semibold text-sm border border-line transition-all disabled:opacity-50"
            style={{
              minHeight: 48,
              background: countdown > 0 ? '#F8F9FA' : '#FFFFFF',
              color: countdown > 0 ? '#6B7280' : '#1E2022',
            }}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend confirmation email'}
          </button>

          {resendStatus === 'success' && (
            <p className="text-sm font-medium" style={{ color: '#00C47A' }}>Email sent — check your inbox</p>
          )}
          {resendStatus === 'error' && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{resendError}</p>
          )}
        </div>

        <p className="text-center text-sm text-muted">
          Wrong email?{' '}
          <Link href="/signup" className="text-ink font-medium hover:underline">
            Go back to sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  )
}
