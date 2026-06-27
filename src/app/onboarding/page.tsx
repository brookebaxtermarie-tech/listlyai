'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlatformLogo } from '@/components/AppShell'
import {
  SELLER_INTENTS, FASHION_CATEGORIES, COUNTRIES, LANGUAGES,
  ALL_PLATFORMS, countryByCode,
} from '@/lib/platforms'

const TOTAL_STEPS = 5

export default function OnboardingPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [intent, setIntent] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])
  const [country, setCountry] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')
  const [platforms, setPlatforms] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('onboarded_at').eq('id', user.id).single()
      if (profile?.onboarded_at) { router.replace('/list'); return }
      setUserId(user.id)
      setReady(true)
    })
  }, [router])

  function pickCountry(code: string) {
    setCountry(code)
    const info = countryByCode(code)
    setLanguage(info.language)
    setPlatforms(info.platforms)
  }

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!intent
      case 1: return categories.length > 0
      case 2: return !!country
      case 3: return platforms.length > 0
      default: return true
    }
  }, [step, intent, categories, country, platforms])

  async function finish() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      seller_intent: intent,
      item_categories: categories,
      country,
      language,
      platforms,
      onboarded_at: new Date().toISOString(),
    }).eq('id', userId)
    if (error) { setSaving(false); return }
    router.replace('/list')
  }

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1)
    else finish()
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-line border-t-[#00C47A] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Top bar — logo + progress */}
      <div className="px-4 md:px-8 pt-6 pb-4 flex flex-col gap-4 max-w-xl w-full mx-auto">
        <div className="flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/listly_wordmark_nobg.svg" alt="Listly AI" style={{ height: 30, width: 'auto' }} />
          <span className="t-meta">{step + 1} of {TOTAL_STEPS}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-line)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%`, background: 'var(--color-accent)' }} />
        </div>
      </div>

      {/* Step body */}
      <div className="flex-1 px-4 md:px-8 py-4 max-w-xl w-full mx-auto flex flex-col">
        {step === 0 && (
          <StepShell title="What brings you to Listly?" subtitle="We’ll tailor your experience.">
            <div className="flex flex-col gap-2.5">
              {SELLER_INTENTS.map(o => (
                <SelectCard key={o.id} selected={intent === o.id} onClick={() => setIntent(o.id)} title={o.label} desc={o.desc} />
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="What do you usually sell?" subtitle="Pick all that apply.">
            <div className="grid grid-cols-2 gap-2.5">
              {FASHION_CATEGORIES.map(c => (
                <Chip key={c.id} selected={categories.includes(c.id)} onClick={() => toggle(categories, setCategories, c.id)} label={c.label} />
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="Where are you based?" subtitle="This sets your default language and the platforms we suggest.">
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                {COUNTRIES.map(c => (
                  <Chip key={c.code} selected={country === c.code} onClick={() => pickCountry(c.code)} label={c.label} />
                ))}
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="t-label">Description language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-line bg-card text-ink text-sm focus:outline-none focus:ring-2 focus:border-accent"
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <p className="t-meta">Your listing descriptions will be written in this language. Change it anytime in Settings.</p>
              </div>
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="Where do you sell?" subtitle="Pre-selected for your region — adjust as you like. We’ll apply these to every listing.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_PLATFORMS.map(p => {
                const selected = platforms.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(platforms, setPlatforms, p.id)}
                    className="flex items-center gap-2.5 rounded-xl border px-3 py-3 transition-colors text-left"
                    style={{
                      borderColor: selected ? 'var(--color-accent)' : 'var(--color-line)',
                      background: selected ? 'var(--color-accent-tint)' : 'var(--color-card)',
                    }}
                  >
                    <PlatformLogo id={p.id} size={24} />
                    <span className="text-sm font-medium text-ink flex-1 truncate">{p.label}</span>
                    <CheckDot on={selected} />
                  </button>
                )
              })}
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="One last thing" subtitle="The browser extension drops your listings straight into Vinted, eBay and more.">
            <div className="surface-card p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">🧩</span>
                <div>
                  <p className="t-card text-ink">Listly browser extension</p>
                  <p className="t-meta mt-0.5">A Pro feature. You can set it up anytime from Settings → Extension — no rush.</p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--color-fill)' }}>
                <p className="t-meta">You’re all set. Tap below to start your first listing.</p>
              </div>
            </div>
          </StepShell>
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 bg-page border-t border-line px-4 md:px-8 py-3">
        <div className="max-w-xl w-full mx-auto flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="rounded-xl font-medium text-sm border border-line text-ink hover:bg-[var(--color-fill)] transition-colors px-4" style={{ minHeight: 48 }}>
              Back
            </button>
          )}
          <button
            onClick={next}
            disabled={!canNext || saving}
            className="flex-1 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-50"
            style={{ minHeight: 48, background: 'var(--color-accent)' }}
          >
            {saving ? 'Setting up…' : step === TOTAL_STEPS - 1 ? 'Start listing →' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Step primitives ──────────────────────────────────────────────────────────

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="t-display text-ink">{title}</h1>
        {subtitle && <p className="t-body text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function SelectCard({ selected, onClick, title, desc }: { selected: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-colors text-left"
      style={{
        borderColor: selected ? 'var(--color-accent)' : 'var(--color-line)',
        background: selected ? 'var(--color-accent-tint)' : 'var(--color-card)',
      }}
    >
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="t-meta">{desc}</span>
      </div>
      <CheckDot on={selected} />
    </button>
  )
}

function Chip({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 transition-colors text-left"
      style={{
        borderColor: selected ? 'var(--color-accent)' : 'var(--color-line)',
        background: selected ? 'var(--color-accent-tint)' : 'var(--color-card)',
      }}
    >
      <span className="text-sm font-medium text-ink truncate">{label}</span>
      <CheckDot on={selected} />
    </button>
  )
}

function CheckDot({ on }: { on: boolean }) {
  return (
    <span
      className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
      style={{ width: 20, height: 20, background: on ? 'var(--color-accent)' : 'transparent', border: on ? 'none' : '2px solid var(--color-line)' }}
    >
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  )
}
