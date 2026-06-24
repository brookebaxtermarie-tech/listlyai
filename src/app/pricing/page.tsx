'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Plan {
  id: string
  name: string
  price: string
  period: string
  description: string
  cta: string
  ctaDisabled: boolean
  highlighted?: boolean
  features: string[]
  notIncluded: string[]
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: '',
    description: 'Everything you need to start listing.',
    cta: 'Your current plan',
    ctaDisabled: true,
    features: [
      'AI listing from a single photo',
      'Up to 3 platforms per listing',
      '10 listings per month',
      'Copy-paste output',
    ],
    notIncluded: [
      'Batch upload',
      'All 7 platforms',
      'Listing history',
      'Direct publishing',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€8.99',
    period: '/month',
    description: 'For serious resellers listing in volume.',
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
    highlighted: true,
    features: [
      'Everything in Free',
      'All 7 platforms',
      'Batch upload (up to 10 photos)',
      '200 listings per month',
      'Full listing history',
    ],
    notIncluded: [
      'Direct publish to eBay / Allegro',
      'Analytics dashboard',
    ],
  },
  {
    id: 'power',
    name: 'Power',
    price: '€19',
    period: '/month',
    description: 'For power users who want everything automated.',
    cta: 'Upgrade to Power',
    ctaDisabled: false,
    features: [
      'Everything in Pro',
      'Direct publish to eBay + Allegro (Phase 2, coming soon)',
      'Unlimited listings',
      'Analytics dashboard',
      'Priority AI processing',
    ],
    notIncluded: [],
  },
]

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2, opacity: 0.25 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function PricingPage() {
  const router = useRouter()
  const [toastText, setToastText] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastText(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3500)
  }

  async function handleCta(planId: string) {
    if (planId === 'free') return
    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        showToast(data.error ?? 'Something went wrong — please try again.')
      }
    } catch {
      showToast('Network error — please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="bg-card border-b border-line">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="font-mono text-sm text-muted hover:text-ink transition-colors"
            style={{ minHeight: 44 }}
          >
            ← Back
          </button>
          <span className="font-bold text-ink tracking-tight" style={{ fontFamily: 'var(--font-header)' }}>Listly AI</span>
          <div style={{ width: 60 }} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-10">

        <div className="text-center flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-ink tracking-tight">Simple pricing</h1>
          <p className="text-muted text-base max-w-sm mx-auto leading-relaxed">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className="bg-card rounded-2xl border flex flex-col"
              style={{
                borderColor: plan.highlighted ? '#00C47A' : '#E5E7EB',
                boxShadow: plan.highlighted ? '0 0 0 1px #00C47A' : undefined,
              }}
            >
              {plan.highlighted && (
                <div
                  className="text-center py-1.5 rounded-t-2xl font-mono text-xs tracking-widest uppercase"
                  style={{ background: '#00C47A', color: '#FFFFFF' }}
                >
                  Most popular
                </div>
              )}

              <div className="p-6 flex flex-col gap-5 flex-1">

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">{plan.name}</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl font-semibold text-ink tracking-tight">{plan.price}</span>
                    {plan.period && <span className="text-muted text-sm ml-0.5">{plan.period}</span>}
                  </div>
                  <p className="text-muted text-sm leading-relaxed">{plan.description}</p>
                </div>

                <button
                  onClick={() => handleCta(plan.id)}
                  disabled={plan.ctaDisabled}
                  className="w-full rounded-xl font-medium text-sm transition-opacity"
                  style={{
                    minHeight: 44,
                    background: plan.ctaDisabled
                      ? '#E5E7EB'
                      : plan.highlighted
                      ? '#00C47A'
                      : '#1E2022',
                    color: plan.ctaDisabled ? '#8A7F72' : '#FFFFFF',
                    cursor: plan.ctaDisabled ? 'default' : 'pointer',
                    opacity: 1,
                  }}
                >
                  {loadingPlan === plan.id ? 'Redirecting…' : plan.cta}
                </button>

                <div className="flex flex-col gap-2.5">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5 text-sm text-ink">
                      <span style={{ color: '#00C47A' }}><CheckIcon /></span>
                      <span>{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map(f => (
                    <div key={f} className="flex items-start gap-2.5 text-sm text-muted">
                      <XIcon />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ))}
        </div>

        <div className="text-center flex flex-col gap-1">
          <p className="text-muted text-sm">
            Questions?{' '}
            <a
              href="mailto:listlyai.contact@gmail.com"
              className="text-ink underline underline-offset-2"
            >
              Email us
            </a>
          </p>
          <div className="flex items-center gap-4 justify-center mt-1">
            <a href="/terms" className="text-xs text-muted hover:text-ink underline underline-offset-2 transition-colors">Terms of Service</a>
            <a href="/privacy" className="text-xs text-muted hover:text-ink underline underline-offset-2 transition-colors">Privacy Policy</a>
          </div>
        </div>

      </main>

      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-ink text-page text-xs font-mono whitespace-nowrap shadow-lg pointer-events-none"
        style={{
          bottom: '2rem',
          opacity: toastVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {toastText}
      </div>
    </div>
  )
}
