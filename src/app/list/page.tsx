'use client'

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppShell, { PlatformLogo } from '@/components/AppShell'
import { Suspense } from 'react'

type Plan = 'FREE' | 'PRO' | 'POWER'

interface BatchResult {
  id: string
  preview: string
  listing: unknown
  status: 'ready' | 'failed'
  error?: string
}

const PLATFORMS = [
  { id: 'ebay',          label: 'eBay',          color: '#E53238' },
  { id: 'vinted',        label: 'Vinted',        color: '#007782' },
  { id: 'depop',         label: 'Depop',         color: '#FF4040' },
  { id: 'poshmark',      label: 'Poshmark',      color: '#C4375E' },
  { id: 'mercari',       label: 'Mercari',       color: '#FF0211' },
  { id: 'leboncoin',     label: 'Leboncoin',     color: '#F56B2A' },
  { id: 'wallapop',      label: 'Wallapop',      color: '#13C1AC' },
  { id: 'kleinanzeigen', label: 'Kleinanzeigen', color: '#C4161C' },
  { id: 'allegro',       label: 'Allegro',       color: '#FF5A00' },
]

const FREE_PLATFORM_LIMIT = 3

const LOADING_MESSAGES = [
  'Spotting the brand and garment type…',
  'Checking condition and colour…',
  'Writing your platform descriptions…',
]

// ─── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function ImagesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton({ message }: { message?: string }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (message) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
        setVisible(true)
      }, 400)
    }, 2500)
    return () => clearInterval(interval)
  }, [message])

  return (
    <>
      <div className="flex flex-col gap-4 py-4">
        <div className="w-full rounded-xl overflow-hidden" style={{ height: 200 }}>
          <div className="w-full h-full skeleton-shimmer" />
        </div>
        <div className="flex flex-col gap-3 px-1">
          <div className="skeleton-shimmer rounded-md" style={{ height: 14, width: '80%' }} />
          <div className="skeleton-shimmer rounded-md" style={{ height: 14, width: '55%' }} />
          <div className="skeleton-shimmer rounded-md" style={{ height: 14, width: '65%' }} />
        </div>
        <div className="flex gap-2 px-1">
          <div className="skeleton-shimmer rounded-full" style={{ height: 28, width: 72 }} />
          <div className="skeleton-shimmer rounded-full" style={{ height: 28, width: 56 }} />
        </div>
        <p
          className="text-center font-sans text-sm"
          style={{ color: '#8A7F72', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}
        >
          {message ?? LOADING_MESSAGES[msgIndex]}
        </p>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #E8E3DC 25%, #F0ECE5 50%, #E8E3DC 75%);
          background-size: 800px 100%;
          animation: shimmer 1.6s infinite linear;
        }
      `}</style>
    </>
  )
}

// ─── Upgrade prompt ────────────────────────────────────────────────────────────

function UpgradePrompt({ feature, onDismiss }: { feature: string; onDismiss: () => void }) {
  const router = useRouter()
  return (
    <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4" style={{ borderColor: '#00C47A' }}>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-widest text-muted uppercase">Pro feature</span>
        <p className="font-medium text-ink text-sm leading-snug">{feature} is available on the Pro plan.</p>
        <p className="text-muted text-sm">Upgrade for batch upload, all 7 platforms, and listing history.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/pricing')}
          className="flex-1 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
          style={{ minHeight: 44, background: '#00C47A', color: '#FFFFFF' }}
        >
          View plans
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 rounded-xl text-sm font-medium border border-line text-ink hover:border-muted transition-colors"
          style={{ minHeight: 44 }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function ListPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded') === '1'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)

  // Auth + plan
  const [authChecked, setAuthChecked] = useState(false)
  const [plan, setPlan] = useState<Plan>('FREE')

  // Single mode state
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [batchPreviews, setBatchPreviews] = useState<string[]>([])
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)

  // Shared
  const [platforms, setPlatforms] = useState<string[]>(['ebay', 'vinted', 'depop'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)

  useEffect(() => {
    const client = createClient()
    client.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      setAuthChecked(true)
      const { data } = await client.from('profiles').select('plan').eq('id', user.id).single()
      if (data?.plan) setPlan(data.plan as Plan)
    })
  }, [router])

  useEffect(() => {
    const saved = sessionStorage.getItem('listai_saved_platforms')
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) setPlatforms(parsed)
      } catch { /* ignore */ }
    }
  }, [])

  // ── Validation ────────────────────────────────────────────────────────────────

  function validateFile(f: File): string | null {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(f.type)) return 'Please upload a JPG, PNG, or WEBP image.'
    if (f.size > 5 * 1024 * 1024) return 'Image must be under 5MB.'
    return null
  }

  // ── Single mode handlers ───────────────────────────────────────────────────────

  function applyFile(f: File) {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError(null)
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) applyFile(f)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) applyFile(f)
  }

  async function handleAnalyse() {
    if (!file || !preview) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('platforms', JSON.stringify(platforms))
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      if (res.status === 429) {
        setRateLimited(true)
        return
      }
      if (!res.ok) {
        try {
          const errData = await res.json()
          setError(errData.error ?? 'Extraction failed. Please try again.')
        } catch {
          setError('Extraction failed. Please try again.')
        }
        return
      }
      const listing = await res.json()
      sessionStorage.setItem('listai_listing', JSON.stringify(listing))
      sessionStorage.setItem('listai_platforms', JSON.stringify(platforms))
      sessionStorage.setItem('listai_preview', preview)
      router.push('/list/review')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Batch mode handlers ────────────────────────────────────────────────────────

  function handleBatchInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return

    const validFiles: File[] = []
    const errors: string[] = []

    for (const f of selected) {
      const err = validateFile(f)
      if (err) { errors.push(`${f.name}: ${err}`); continue }
      validFiles.push(f)
    }

    const combined = [...batchFiles, ...validFiles].slice(0, 10)
    const combinedPreviews = [
      ...batchPreviews,
      ...validFiles.slice(0, 10 - batchFiles.length).map(f => URL.createObjectURL(f)),
    ]

    setBatchFiles(combined)
    setBatchPreviews(combinedPreviews)

    if (errors.length) setError(errors[0])
    else setError(null)

    // Reset input so the same files can be re-selected if needed
    e.target.value = ''
  }

  function removeBatchFile(index: number) {
    URL.revokeObjectURL(batchPreviews[index])
    setBatchFiles(prev => prev.filter((_, i) => i !== index))
    setBatchPreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function handleAnalyseBatch() {
    if (!batchFiles.length) return
    setLoading(true)
    setError(null)
    setBatchProgress({ done: 0, total: batchFiles.length })

    const results = await Promise.allSettled(
      batchFiles.map(async (f, i) => {
        const fd = new FormData()
        fd.append('image', f)
        fd.append('platforms', JSON.stringify(platforms))
        const res = await fetch('/api/extract', { method: 'POST', body: fd })
        if (!res.ok) {
          let msg = 'Extraction failed'
          try { const d = await res.json(); msg = d.error ?? msg } catch { /* ignore */ }
          throw new Error(msg)
        }
        const listing = await res.json()
        setBatchProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null)
        return { listing, preview: batchPreviews[i] }
      })
    )

    const batchResults: BatchResult[] = results.map((r, i) => ({
      id: crypto.randomUUID(),
      preview: batchPreviews[i],
      listing: r.status === 'fulfilled' ? r.value.listing : null,
      status: r.status === 'fulfilled' ? 'ready' : 'failed',
      error: r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : undefined,
    }))

    sessionStorage.setItem('listai_batch_results', JSON.stringify(batchResults))
    sessionStorage.setItem('listai_platforms', JSON.stringify(platforms))
    setLoading(false)
    setBatchProgress(null)
    router.push('/list/batch-review')
  }

  // ── Platform toggle ────────────────────────────────────────────────────────────

  function togglePlatform(id: string) {
    setPlatforms(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter(p => p !== id)
      }
      // Free plan: cap at 3 platforms
      if (plan === 'FREE' && prev.length >= FREE_PLATFORM_LIMIT) return prev
      return [...prev, id]
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (!authChecked) return <div className="min-h-screen bg-page" />

  const isPro = plan === 'PRO' || plan === 'POWER'

  return (
    <AppShell>
    <div className="min-h-screen bg-page pb-16 md:pb-0">
      <header className="bg-card border-b border-line sticky top-0 z-20">
        <div className="px-4 md:px-8 flex items-center" style={{ minHeight: 57 }}>
          {/* Left — page title */}
          <div className="flex-1">
            <h1 className="font-bold text-ink text-sm" style={{ fontFamily: 'var(--font-header)' }}>
              {batchMode ? 'Batch upload' : 'New listing'}
            </h1>
            <p className="text-muted text-xs hidden md:block">Upload a photo · select platforms · analyse</p>
          </div>
          {/* Center — breadcrumb */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-ink">1 · Upload</span>
            <span>→</span>
            <span>2 · Review</span>
          </div>
          {/* Right — spacer to balance */}
          <div className="flex-1" />
        </div>
      </header>

      {upgraded && (
        <div className="px-4 md:px-8 py-3 flex items-center gap-3" style={{ background: '#F0FDF4', borderBottom: '1px solid #A7F3D0' }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00C47A' }} />
          <p className="text-sm font-medium" style={{ color: '#065F46' }}>
            Welcome to Pro! All 7 platforms and batch upload are now unlocked.
          </p>
        </div>
      )}

      <main className="px-4 md:px-8 py-6 md:py-8 max-w-5xl mx-auto">
        {/* Two-column desktop layout */}
        <div className="md:grid md:grid-cols-2 md:gap-8 flex flex-col gap-8">

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />
        <input
          ref={batchInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleBatchInputChange}
        />

        {loading ? (
          <div className="md:col-span-2">
          <LoadingSkeleton
            message={
              batchProgress
                ? `Analysing ${batchProgress.done} of ${batchProgress.total} photos…`
                : undefined
            }
          />
          </div>
        ) : (
          <>
          {/* LEFT COLUMN — upload zone */}
          <div className="flex flex-col gap-5">
            {/* ── Mode toggle ── */}
            <div className="flex gap-1 bg-card border border-line rounded-xl p-1">
              <button
                onClick={() => { setBatchMode(false); setShowUpgradePrompt(false) }}
                className="flex-1 rounded-lg text-sm font-medium transition-all"
                style={{
                  minHeight: 40,
                  background: !batchMode ? '#18140F' : 'transparent',
                  color: !batchMode ? '#FFFFFF' : '#8A7F72',
                }}
              >
                Single photo
              </button>
              <button
                onClick={() => {
                  if (!isPro) { setShowUpgradePrompt(true); return }
                  setBatchMode(true)
                  setShowUpgradePrompt(false)
                }}
                className="flex-1 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  minHeight: 40,
                  background: batchMode ? '#18140F' : 'transparent',
                  color: batchMode ? '#FFFFFF' : '#8A7F72',
                }}
              >
                <ImagesIcon />
                Batch
                {!isPro && (
                  <span
                    className="font-mono text-xs rounded-full px-2 py-0.5"
                    style={{ background: '#00C47A', color: '#FFFFFF', fontSize: 10 }}
                  >
                    PRO
                  </span>
                )}
              </button>
            </div>

            {/* ── Upgrade prompt ── */}
            {showUpgradePrompt && (
              <UpgradePrompt
                feature="Batch upload"
                onDismiss={() => setShowUpgradePrompt(false)}
              />
            )}

            {/* ── Single mode ── */}
            {!batchMode && (
              <section className="flex flex-col gap-2">
                <label className="font-mono text-xs tracking-widest text-muted uppercase">Photo</label>

                {/* Mobile tap target */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="sm:hidden relative rounded-2xl bg-card cursor-pointer overflow-hidden"
                  style={{ minHeight: 260 }}
                >
                  {preview ? (
                    <img src={preview} alt="Selected photo" className="w-full object-contain bg-page" style={{ maxHeight: 400 }} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                      <div className="w-20 h-20 rounded-full bg-line flex items-center justify-center text-muted">
                        <CameraIcon />
                      </div>
                      <div className="text-center">
                        <p className="text-ink font-medium text-lg">Tap to take or upload a photo</p>
                        <p className="text-muted text-sm mt-1">JPG, PNG, WEBP · max 5MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop drag zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    'hidden sm:block relative rounded-2xl border-2 border-dashed transition-all overflow-hidden cursor-pointer',
                    isDragging
                      ? 'border-accent bg-accent/10'
                      : preview
                      ? 'border-line'
                      : 'border-line bg-card hover:border-accent/60',
                  ].join(' ')}
                  style={{ minHeight: 260 }}
                >
                  {preview ? (
                    <img src={preview} alt="Selected photo" className="w-full object-contain bg-page" style={{ maxHeight: 400 }} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                      <div className="w-14 h-14 rounded-full bg-line flex items-center justify-center text-muted">
                        <UploadIcon />
                      </div>
                      <div className="text-center">
                        <p className="text-ink font-medium">Drop your photo here</p>
                        <p className="text-muted text-sm mt-1">or click to browse · JPG, PNG, WEBP · max 5MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {error && <p className="text-red-600 text-sm font-mono mt-1">{error}</p>}
                {rateLimited && (
                  <div className="rounded-2xl border border-line bg-card p-5 flex flex-col gap-4">
                    <div>
                      <p className="font-semibold text-ink text-sm">You&apos;ve used all your free listings this month.</p>
                      <p className="text-muted text-sm mt-1">Upgrade to Pro for 200 listings/month, all 7 platforms, and full listing history.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={async () => {
                          const res = await fetch('/api/stripe/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ plan: 'pro' }),
                          })
                          const data = await res.json() as { url?: string }
                          if (data.url) window.location.href = data.url
                        }}
                        className="w-full rounded-xl font-semibold text-sm"
                        style={{ minHeight: 48, background: '#00C47A', color: '#FFFFFF' }}
                      >
                        Upgrade to Pro — €8.99/month
                      </button>
                      <button
                        onClick={() => setRateLimited(false)}
                        className="w-full rounded-xl font-medium text-sm text-muted"
                        style={{ minHeight: 44 }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Batch mode ── */}
            {batchMode && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs tracking-widest text-muted uppercase">Photos</label>
                  <span className="font-mono text-xs text-muted">{batchFiles.length}/10</span>
                </div>

                {/* Thumbnail grid */}
                {batchFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {batchPreviews.map((src, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden bg-card border border-line aspect-square">
                        <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeBatchFile(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/70 flex items-center justify-center text-white hover:bg-ink transition-colors"
                        >
                          <XIcon />
                        </button>
                        <span
                          className="absolute bottom-1.5 left-1.5 font-mono text-white rounded-md px-1.5"
                          style={{ fontSize: 10, background: 'rgba(0,0,0,0.5)' }}
                        >
                          {i + 1}
                        </span>
                      </div>
                    ))}

                    {/* Add more slot */}
                    {batchFiles.length < 10 && (
                      <button
                        onClick={() => batchInputRef.current?.click()}
                        className="rounded-xl border-2 border-dashed border-line bg-card hover:border-muted transition-colors aspect-square flex flex-col items-center justify-center gap-1 text-muted"
                      >
                        <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
                        <span className="font-mono text-xs">Add</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {batchFiles.length === 0 && (
                  <button
                    onClick={() => batchInputRef.current?.click()}
                    className="rounded-2xl border-2 border-dashed border-line bg-card hover:border-muted transition-colors flex flex-col items-center justify-center gap-3 text-muted"
                    style={{ minHeight: 200 }}
                  >
                    <div className="w-14 h-14 rounded-full bg-line flex items-center justify-center">
                      <ImagesIcon />
                    </div>
                    <div className="text-center">
                      <p className="text-ink font-medium text-sm">Select up to 10 photos</p>
                      <p className="text-muted text-xs mt-0.5">JPG, PNG, WEBP · max 5MB each</p>
                    </div>
                  </button>
                )}

                {error && <p className="text-red-600 text-sm font-mono">{error}</p>}
              </section>
            )}

          </div>{/* end left column */}

          {/* RIGHT COLUMN — platform selector + CTA */}
          <div className="flex flex-col gap-5">
            {/* ── Platform selector ── */}
            <section className="flex flex-col gap-3">
              <div>
                <p className="font-semibold text-ink text-sm" style={{ fontFamily: 'var(--font-header)' }}>
                  Where are you selling?
                </p>
                <p className="text-xs text-muted mt-0.5">Toggle the platforms you want listings written for</p>
              </div>
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs tracking-widest text-muted uppercase">Platforms</label>
                {plan === 'FREE' && (
                  <span className="font-mono text-xs text-muted">
                    {platforms.length}/{FREE_PLATFORM_LIMIT} free
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(p => {
                  const active = platforms.includes(p.id)
                  const atLimit = plan === 'FREE' && !active && platforms.length >= FREE_PLATFORM_LIMIT
                  return (
                    <button
                      key={p.id}
                      onClick={() => !atLimit && togglePlatform(p.id)}
                      disabled={atLimit}
                      className="flex flex-col gap-2 p-3 rounded-xl border bg-card transition-all text-left"
                      style={{
                        borderColor: active ? p.color : '#E5E7EB',
                        borderLeft: `3px solid ${active ? p.color : '#E5E7EB'}`,
                        opacity: atLimit ? 0.35 : 1,
                        cursor: atLimit ? 'not-allowed' : 'pointer',
                        background: active ? `${p.color}08` : '#FFFFFF',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <PlatformLogo id={p.id} type="icon" size={28} />
                        <span
                          className="w-9 h-5 rounded-full flex items-center flex-shrink-0"
                          style={{ background: active ? p.color : '#E5E7EB', padding: '2px', transition: 'background 0.2s' }}
                        >
                          <span
                            className="w-4 h-4 rounded-full bg-white shadow-sm"
                            style={{ transform: active ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s' }}
                          />
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-ink">{p.label}</span>
                    </button>
                  )
                })}
              </div>
              {plan === 'FREE' && platforms.length >= FREE_PLATFORM_LIMIT && (
                <button
                  onClick={() => router.push('/pricing')}
                  className="text-left text-xs font-medium underline underline-offset-2"
                  style={{ color: '#00C47A' }}
                >
                  Upgrade to Pro for all 7 platforms →
                </button>
              )}
            </section>

            {/* ── CTA ── */}
            {!batchMode ? (
              <button
                onClick={handleAnalyse}
                disabled={!file}
                className="w-full py-3.5 rounded-xl font-semibold text-page bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              >
                Analyse
              </button>
            ) : (
              <button
                onClick={handleAnalyseBatch}
                disabled={batchFiles.length === 0}
                className="w-full py-3.5 rounded-xl font-semibold text-page bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              >
                {batchFiles.length === 0
                  ? 'Add photos to analyse'
                  : `Analyse all ${batchFiles.length} photo${batchFiles.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>{/* end right column */}
          </>
        )}
        </div>{/* end two-column grid */}
      </main>
    </div>
    </AppShell>
  )
}

export default function ListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    }>
      <ListPageInner />
    </Suspense>
  )
}
