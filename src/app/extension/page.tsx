'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'

type Plan = 'FREE' | 'PRO' | 'POWER'

const STEPS = [
  {
    num: 1,
    title: 'Add to Chrome',
    desc: 'Click the button below to install the Listly AI extension from the Chrome Web Store. Takes about 10 seconds.',
  },
  {
    num: 2,
    title: 'Generate your API key',
    desc: 'Use the key generator below. Copy your key — you\'ll paste it into the extension once.',
  },
  {
    num: 3,
    title: 'Open the extension and connect',
    desc: 'Click the Listly AI icon in your Chrome toolbar. Tap the settings gear, paste your key, and hit Save.',
  },
  {
    num: 4,
    title: 'Go list something',
    desc: 'Open Vinted, eBay, or Depop in a new tab. Click the extension — it\'ll auto-detect the platform and show your latest listing ready to paste.',
  },
]

export default function ExtensionPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyVisible, setKeyVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetch('/api/extension/generate-key').then(r => r.json()).then(d => {
        setPlan(d.plan ?? 'FREE')
        setApiKey(d.key ?? null)
        setLoading(false)
      })
    })
  }, [router])

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/extension/generate-key', { method: 'POST' })
    const d = await res.json()
    if (d.key) setApiKey(d.key)
    setKeyVisible(true)
    setGenerating(false)
  }

  async function handleRevoke() {
    if (!revokeConfirm) { setRevokeConfirm(true); return }
    await fetch('/api/extension/generate-key', { method: 'DELETE' })
    setApiKey(null)
    setRevokeConfirm(false)
  }

  function handleCopy() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isPro = plan === 'PRO' || plan === 'POWER'

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-6 h-6 border-2 border-line border-t-[#00C47A] rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen bg-page pb-16 md:pb-0">

        {/* Header */}
        <header className="bg-card border-b border-line sticky top-0 z-20">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-ink text-lg" style={{ fontFamily: 'var(--font-header)' }}>
                Browser Extension
              </h1>
              <p className="text-muted text-xs mt-0.5">Copy your listings directly into any selling platform</p>
            </div>
            {!isPro && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#E6F9F1', color: '#007A4D' }}>
                Pro feature
              </span>
            )}
          </div>
        </header>

        <div className="flex-1 px-4 md:px-8 py-6 max-w-2xl w-full mx-auto">

          {/* Free tier — teaser */}
          {!isPro && (
            <div className="space-y-6">

              {/* Locked preview card */}
              <div className="rounded-xl border border-line bg-card overflow-hidden relative">
                <div className="absolute inset-0 backdrop-blur-[2px] bg-white/60 z-10 flex flex-col items-center justify-center gap-3 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-ink">Upgrade to Pro to unlock</p>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="text-sm font-semibold px-5 py-2 rounded-lg text-white"
                    style={{ background: '#00C47A' }}
                  >
                    See plans
                  </button>
                </div>

                {/* Blurred preview of the extension UI */}
                <div className="p-4 select-none pointer-events-none">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-[#00C47A] flex items-center justify-center text-white text-xs font-bold">L</div>
                    <span className="text-sm font-semibold text-ink">Listly AI Extension</span>
                  </div>
                  <div className="bg-[#F8F9FA] rounded-lg border border-line p-3 space-y-3 opacity-50">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-16 bg-[#E6F9F1] rounded-full" />
                      <div className="h-5 w-32 bg-line rounded" />
                    </div>
                    <div className="h-20 bg-line rounded-lg" />
                    {['Title', 'Price', 'Description'].map(f => (
                      <div key={f} className="flex items-center justify-between gap-2">
                        <div>
                          <div className="h-2.5 w-10 bg-line rounded mb-1" />
                          <div className="h-3.5 w-40 bg-line rounded" />
                        </div>
                        <div className="h-7 w-12 bg-line rounded" />
                      </div>
                    ))}
                    <div className="h-9 w-full bg-[#00C47A] opacity-30 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* What you get */}
              <div className="rounded-xl border border-line bg-card p-5 space-y-3">
                <h2 className="font-semibold text-ink text-sm" style={{ fontFamily: 'var(--font-header)' }}>
                  What the extension does
                </h2>
                {[
                  ['🎯', 'Auto-detects which platform you\'re on (Vinted, eBay, Depop, and more)'],
                  ['📋', 'Shows your latest listing with the right description pre-selected'],
                  ['⚡️', 'One-click copy for title, price, condition, and description separately'],
                  ['🖼️', 'Copy your listing photo straight to your clipboard'],
                  ['📦', 'Switch between your recent listings without leaving the page'],
                ].map(([icon, text]) => (
                  <div key={text as string} className="flex items-start gap-3">
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <span className="text-sm text-muted">{text}</span>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Pro tier — full onboarding */}
          {isPro && (
            <div className="space-y-6">

              {/* Step-by-step guide */}
              <div className="rounded-xl border border-line bg-card divide-y divide-line overflow-hidden">
                {STEPS.map((step, i) => (
                  <div key={step.num} className="flex gap-4 p-5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{
                        background: i === 0 || (i === 1 && !apiKey) || (i === 2 && apiKey) || (i === 3 && apiKey)
                          ? '#00C47A' : '#E5E7EB',
                        color: i === 0 || (i === 1 && !apiKey) || (i === 2 && apiKey) || (i === 3 && apiKey)
                          ? '#fff' : '#6B7280',
                      }}
                    >
                      {step.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-ink mb-1">{step.title}</p>
                      <p className="text-xs text-muted leading-relaxed">{step.desc}</p>

                      {/* Step 1 — Chrome install button */}
                      {step.num === 1 && (
                        <a
                          href="https://chrome.google.com/webstore"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-white text-xs font-semibold"
                          style={{ background: '#00C47A' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Add to Chrome
                        </a>
                      )}

                      {/* Step 2 — API key generator */}
                      {step.num === 2 && (
                        <div className="mt-3 space-y-2">
                          {apiKey ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-[#F8F9FA] border border-line rounded-lg px-3 py-2 font-mono text-xs text-ink truncate">
                                  {keyVisible ? apiKey : '•'.repeat(32)}
                                </div>
                                <button
                                  onClick={() => setKeyVisible(v => !v)}
                                  className="text-xs text-muted hover:text-ink px-2 py-2 border border-line rounded-lg flex-shrink-0"
                                >
                                  {keyVisible ? 'Hide' : 'Show'}
                                </button>
                                <button
                                  onClick={handleCopy}
                                  className="text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0 text-white"
                                  style={{ background: copied ? '#007A4D' : '#00C47A' }}
                                >
                                  {copied ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <button
                                onClick={handleRevoke}
                                className="text-xs text-muted hover:text-red-500 transition-colors"
                              >
                                {revokeConfirm ? 'Are you sure? Click again to revoke.' : 'Revoke & regenerate'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleGenerate}
                              disabled={generating}
                              className="px-4 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                              style={{ background: '#00C47A' }}
                            >
                              {generating ? 'Generating…' : 'Generate API key'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* How to use guide */}
              <div className="rounded-xl border border-line bg-card p-5 space-y-4">
                <h2 className="font-semibold text-ink text-sm" style={{ fontFamily: 'var(--font-header)' }}>
                  How to use it
                </h2>
                <ol className="space-y-4">
                  {[
                    ['Upload and approve your listings on Listly AI as normal.', ''],
                    ['Go to the selling platform you want to list on (Vinted, eBay, Depop, etc.) and open the "Add listing" page.', ''],
                    ['Click the Listly AI icon in your Chrome toolbar. The extension opens and auto-detects the platform you\'re on.', ''],
                    ['Your most recent listing appears, with the right description already selected for that platform.', ''],
                    ['Click Copy next to each field — title, price, condition, description — and paste into the form. Or hit "Copy all" to grab everything at once.', ''],
                    ['Need a different listing? Use the dropdown at the top to switch between your last 10 approved listings.', ''],
                  ].map(([text], i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted leading-relaxed">
                      <span className="font-semibold text-ink flex-shrink-0">{i + 1}.</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Safari note */}
              <div className="rounded-xl border border-line bg-[#FFFBEB] p-4 flex gap-3">
                <span className="text-base flex-shrink-0">🧭</span>
                <div>
                  <p className="text-xs font-semibold text-ink mb-1">Safari support coming soon</p>
                  <p className="text-xs text-muted leading-relaxed">
                    We're working on a Safari version — it goes through App Store review so it takes a little longer. Chrome and Firefox work today.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </AppShell>
  )
}
