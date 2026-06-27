'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell, { PlatformLogo } from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { ALL_PLATFORMS, COUNTRIES, LANGUAGES } from '@/lib/platforms'

type Plan = 'FREE' | 'PRO'
type SectionId = 'account' | 'subscription' | 'platforms' | 'preferences' | 'extension'

const SECTIONS: { id: SectionId; label: string; desc: string }[] = [
  { id: 'account',      label: 'Account',      desc: 'Profile, password & sign out' },
  { id: 'subscription', label: 'Subscription', desc: 'Your plan & billing' },
  { id: 'platforms',    label: 'Platforms',    desc: 'Where you sell' },
  { id: 'preferences',  label: 'Preferences',  desc: 'Language & region' },
  { id: 'extension',    label: 'Extension',    desc: 'Browser companion' },
]

// ── Shared primitives (design book) ─────────────────────────────────────────

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="t-card text-ink">{title}</h2>
        {desc && <p className="t-meta">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

function Row({ label, value, action }: { label: string; value?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-t border-line first:border-t-0">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-ink">{label}</span>
        {value && <span className="t-meta truncate">{value}</span>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

function btnPrimary(extra = '') {
  return `rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60 px-4 ${extra}`
}
function btnGhost(extra = '') {
  return `rounded-xl font-medium text-sm border border-line text-ink hover:bg-[var(--color-fill)] transition-colors px-4 ${extra}`
}

function SaveButton({ dirty, saving, onClick }: { dirty: boolean; saving: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={!dirty || saving} className={btnPrimary('h-10 w-fit')} style={{ background: 'var(--color-accent)' }}>
      {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved ✓'}
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [section, setSection] = useState<SectionId>('account')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [memberSince, setMemberSince] = useState<string>('')
  const [plan, setPlan] = useState<Plan>('FREE')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [country, setCountry] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      setEmail(user.email ?? '')
      setMemberSince(user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '')
      const { data: profile } = await supabase.from('profiles').select('plan, platforms, country, language').eq('id', user.id).single()
      setPlan((profile?.plan as Plan) ?? 'FREE')
      setPlatforms(profile?.platforms ?? [])
      setCountry(profile?.country ?? '')
      setLanguage(profile?.language ?? 'en')
      setLoading(false)
    })
  }, [router])

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
      <div className="flex flex-col min-h-screen bg-page pb-20 md:pb-0">

        {/* Header */}
        <header className="bg-card border-b border-line sticky top-0 z-20">
          <div className="px-4 md:px-8 py-4">
            <h1 className="t-title text-ink">Settings</h1>
            <p className="t-meta mt-0.5">Manage your account, plan and preferences</p>
          </div>
        </header>

        {/* Mobile section tabs */}
        <div className="md:hidden border-b border-line bg-card sticky top-[65px] z-10">
          <div className="flex overflow-x-auto px-2" style={{ scrollbarWidth: 'none' }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className="px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  color: section === s.id ? 'var(--color-accent-dark)' : 'var(--color-muted)',
                  borderBottom: `2px solid ${section === s.id ? 'var(--color-accent)' : 'transparent'}`,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-6 flex gap-8">

          {/* Desktop section nav */}
          <nav className="hidden md:flex flex-col gap-1 w-52 flex-shrink-0">
            {SECTIONS.map(s => {
              const active = section === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className="flex flex-col items-start text-left rounded-xl px-3 py-2.5 transition-colors"
                  style={{ background: active ? 'var(--color-accent-tint)' : 'transparent' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-fill)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="text-sm font-semibold" style={{ color: active ? 'var(--color-accent-dark)' : 'var(--color-ink)' }}>{s.label}</span>
                  <span className="t-meta">{s.desc}</span>
                </button>
              )
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {section === 'account'      && <AccountSection email={email} memberSince={memberSince} />}
            {section === 'subscription' && <SubscriptionSection plan={plan} onUpgrade={() => router.push('/pricing')} />}
            {section === 'platforms'    && <PlatformsSection userId={userId} initial={platforms} onSaved={setPlatforms} />}
            {section === 'preferences'  && <PreferencesSection userId={userId} initialCountry={country} initialLanguage={language} onSaved={(c, l) => { setCountry(c); setLanguage(l) }} />}
            {section === 'extension'    && <ExtensionSection plan={plan} onUpgrade={() => router.push('/pricing')} />}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── Account ──────────────────────────────────────────────────────────────────

function AccountSection({ email, memberSince }: { email: string; memberSince: string }) {
  const router = useRouter()
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [signingOut, setSigningOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function sendReset() {
    setResetState('sending')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })
    setResetState('sent')
  }

  async function signOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.push('/login')
  }

  async function deleteAccount() {
    setDeleting(true); setDeleteError(null)
    const res = await fetch('/api/user/delete', { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setDeleteError(d.error ?? 'Something went wrong. Please email us.')
      setDeleting(false); return
    }
    router.replace('/login')
  }

  return (
    <>
      <Card title="Profile" desc="Your account details">
        <div className="flex flex-col">
          <Row label="Email" value={email} />
          <Row label="Member since" value={memberSince || '—'} />
        </div>
      </Card>

      <Card title="Security" desc="Keep your account safe">
        <div className="flex flex-col">
          <Row
            label="Password"
            value={resetState === 'sent' ? 'Reset link sent — check your inbox' : 'Send a reset link to your email'}
            action={
              <button onClick={sendReset} disabled={resetState !== 'idle'} className={btnGhost('h-9')}>
                {resetState === 'sending' ? 'Sending…' : resetState === 'sent' ? 'Sent ✓' : 'Reset password'}
              </button>
            }
          />
          <Row
            label="Sign out"
            value="Sign out of Listly on this device"
            action={
              <button onClick={signOut} disabled={signingOut} className={btnGhost('h-9')}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            }
          />
        </div>
      </Card>

      {/* Danger zone */}
      <section className="rounded-2xl p-5 flex flex-col gap-3" style={{ border: '1px solid #FECACA', background: 'var(--color-danger-tint)' }}>
        <div className="flex flex-col gap-0.5">
          <h2 className="t-card" style={{ color: '#B91C1C' }}>Delete account</h2>
          <p className="t-meta" style={{ color: '#DC2626' }}>Permanently removes your account, listings and images. This cannot be undone.</p>
        </div>
        {confirmDelete ? (
          <div className="flex flex-col gap-3">
            {deleteError && <p className="text-xs" style={{ color: '#B91C1C' }}>{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={deleteAccount} disabled={deleting} className={btnPrimary('h-9')} style={{ background: 'var(--color-danger)' }}>
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className={btnGhost('h-9')}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-sm font-semibold w-fit hover:underline" style={{ color: '#DC2626' }}>
            Delete my account
          </button>
        )}
      </section>
    </>
  )
}

// ── Subscription ─────────────────────────────────────────────────────────────

function SubscriptionSection({ plan, onUpgrade }: { plan: Plan; onUpgrade: () => void }) {
  const isPro = plan === 'PRO'
  return (
    <Card title="Your plan" desc="Manage your subscription">
      <div className="rounded-xl border border-line p-4 flex items-center justify-between gap-4" style={{ background: isPro ? 'var(--color-accent-tint)' : 'var(--color-fill)' }}>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit" style={{ background: isPro ? 'var(--color-accent)' : '#E5E7EB', color: isPro ? '#FFFFFF' : 'var(--color-muted)' }}>
            {plan}
          </span>
          <span className="text-sm font-medium text-ink mt-1">
            {isPro ? 'Pro — batch uploads, extension & more' : 'Free — one listing at a time'}
          </span>
        </div>
        <button onClick={onUpgrade} className={isPro ? btnGhost('h-10') : btnPrimary('h-10')} style={isPro ? undefined : { background: 'var(--color-accent)' }}>
          {isPro ? 'Manage' : 'Upgrade to Pro'}
        </button>
      </div>
      {!isPro && (
        <p className="t-meta">Pro unlocks batch uploads (many items at once) and the browser extension for one-click listing.</p>
      )}
    </Card>
  )
}

// ── Platforms ────────────────────────────────────────────────────────────────

function PlatformsSection({ userId, initial, onSaved }: { userId: string; initial: string[]; onSaved: (v: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(initial)
  const [saving, setSaving] = useState(false)
  const dirty = selected.slice().sort().join(',') !== initial.slice().sort().join(',')

  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function save() {
    if (selected.length === 0) return
    setSaving(true)
    await createClient().from('profiles').update({ platforms: selected }).eq('id', userId)
    onSaved(selected)
    setSaving(false)
  }

  return (
    <Card title="Your selling platforms" desc="Listly pre-selects these every time you create a listing">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ALL_PLATFORMS.map(p => {
          const on = selected.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors text-left"
              style={{ borderColor: on ? 'var(--color-accent)' : 'var(--color-line)', background: on ? 'var(--color-accent-tint)' : 'var(--color-card)' }}
            >
              <PlatformLogo id={p.id} size={22} />
              <span className="text-sm font-medium text-ink flex-1 truncate">{p.label}</span>
              <span className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: on ? 'var(--color-accent)' : 'transparent', border: on ? 'none' : '2px solid var(--color-line)' }}>
                {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </span>
            </button>
          )
        })}
      </div>
      {selected.length === 0 && <p className="t-meta" style={{ color: 'var(--color-danger)' }}>Select at least one platform.</p>}
      <SaveButton dirty={dirty} saving={saving} onClick={save} />
    </Card>
  )
}

// ── Preferences ──────────────────────────────────────────────────────────────

function PreferencesSection({ userId, initialCountry, initialLanguage, onSaved }: { userId: string; initialCountry: string; initialLanguage: string; onSaved: (c: string, l: string) => void }) {
  const [country, setCountry] = useState(initialCountry)
  const [language, setLanguage] = useState(initialLanguage)
  const [saving, setSaving] = useState(false)
  const dirty = country !== initialCountry || language !== initialLanguage

  async function save() {
    setSaving(true)
    await createClient().from('profiles').update({ country, language }).eq('id', userId)
    onSaved(country, language)
    setSaving(false)
  }

  return (
    <Card title="Language & region" desc="Sets the default language of your generated descriptions and which platforms we suggest">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="t-label">Description language</label>
          <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-line bg-card text-ink text-sm focus:outline-none focus:ring-2 focus:border-accent">
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="t-label">Country / region</label>
          <select value={country} onChange={e => setCountry(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-line bg-card text-ink text-sm focus:outline-none focus:ring-2 focus:border-accent">
            <option value="" disabled>Select your country</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <SaveButton dirty={dirty} saving={saving} onClick={save} />
    </Card>
  )
}

// ── Extension ────────────────────────────────────────────────────────────────

function ExtensionSection({ plan, onUpgrade }: { plan: Plan; onUpgrade: () => void }) {
  const isPro = plan === 'PRO'
  const [loading, setLoading] = useState(true)
  const [hasKey, setHasKey] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyVisible, setKeyVisible] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState(false)

  useEffect(() => {
    fetch('/api/extension/generate-key').then(r => r.json()).then(d => {
      setHasKey(!!d.hasKey)
      setLoading(false)
    })
  }, [])

  async function generate() {
    setGenerating(true)
    const res = await fetch('/api/extension/generate-key', { method: 'POST' })
    const d = await res.json()
    if (d.key) { setApiKey(d.key); setHasKey(true); setKeyVisible(true) }
    setGenerating(false)
  }

  async function revoke() {
    if (!revokeConfirm) { setRevokeConfirm(true); return }
    await fetch('/api/extension/generate-key', { method: 'DELETE' })
    setApiKey(null); setHasKey(false); setRevokeConfirm(false)
  }

  function copy() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (!isPro) {
    return (
      <Card title="Browser extension" desc="Copy listings straight into Vinted, eBay, Depop and more">
        <div className="rounded-xl border border-line p-5 flex flex-col items-center text-center gap-3" style={{ background: 'var(--color-fill)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#FFFFFF' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-ink">The extension is a Pro feature</p>
          <p className="t-meta max-w-xs">Auto-detects the platform you&apos;re on and drops in your latest listing, formatted and ready to paste.</p>
          <button onClick={onUpgrade} className={btnPrimary('h-10')} style={{ background: 'var(--color-accent)' }}>Upgrade to Pro</button>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Browser extension" desc="Generate a connection key, then paste it into the extension">
      {loading ? (
        <div className="h-9 flex items-center"><div className="w-5 h-5 border-2 border-line border-t-[#00C47A] rounded-full animate-spin" /></div>
      ) : apiKey ? (
        <div className="flex flex-col gap-2">
          <span className="t-label">Your connection key</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[var(--color-fill)] border border-line rounded-xl px-3 py-2.5 font-mono text-xs text-ink truncate">
              {keyVisible ? apiKey : '•'.repeat(32)}
            </div>
            <button onClick={() => setKeyVisible(v => !v)} className={btnGhost('h-10 flex-shrink-0')}>{keyVisible ? 'Hide' : 'Show'}</button>
            <button onClick={copy} className={btnPrimary('h-10 flex-shrink-0')} style={{ background: copied ? 'var(--color-accent-dark)' : 'var(--color-accent)' }}>{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <p className="t-meta">Paste this into the extension&apos;s settings. Keep it private — it accesses your listings.</p>
          <button onClick={revoke} className="text-xs text-muted hover:text-red-500 transition-colors w-fit mt-1">
            {revokeConfirm ? 'Are you sure? Click again to revoke.' : 'Revoke & regenerate'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="t-body text-ink-2">
            {hasKey ? 'A key is already connected. Generate a new one if you need to reconnect.' : 'You haven’t connected the extension yet. Generate a key to get started.'}
          </p>
          <button onClick={generate} disabled={generating} className={btnPrimary('h-10 w-fit')} style={{ background: 'var(--color-accent)' }}>
            {generating ? 'Generating…' : hasKey ? 'Regenerate key' : 'Generate connection key'}
          </button>
        </div>
      )}
      <div className="rounded-xl border border-line p-4" style={{ background: 'var(--color-fill)' }}>
        <p className="t-label mb-2">Setup</p>
        <ol className="flex flex-col gap-1.5 t-meta">
          <li>1. Install the Listly AI extension in Chrome.</li>
          <li>2. Click the extension icon, open its settings.</li>
          <li>3. Paste your connection key and save.</li>
          <li>4. Open any selling platform and your latest listing appears, ready to paste.</li>
        </ol>
      </div>
    </Card>
  )
}
