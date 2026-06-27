'use client'

import { useState, useRef, useEffect, DragEvent, ChangeEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppShell, { PlatformLogo, SidebarQueue, HistoryItem } from '@/components/AppShell'

type Plan = 'FREE' | 'PRO'

interface BatchResult {
  id: string
  preview: string
  listing: unknown
  status: 'ready' | 'failed'
  error?: string
}

const DEFAULT_PLATFORMS = ['vinted', 'ebay', 'depop']

const LOADING_MESSAGES = [
  'Looking at your photo…',
  'Spotting the brand and garment type…',
  'Checking condition and colour…',
  'Writing your platform descriptions…',
  'Almost there…',
]

// ─── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

// ─── Analyzing state — animated bar + rotating copy + logo pulse ────────────────

function AnalyzingState({ batch }: { batch: { done: number; total: number } | null }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (batch) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
        setVisible(true)
      }, 350)
    }, 2200)
    return () => clearInterval(interval)
  }, [batch])

  const pct = batch ? Math.round((batch.done / batch.total) * 100) : null

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/listly_logo_nobg.svg" alt="" style={{ width: 64, height: 64 }} className="logo-pulse" />

      <div className="w-full max-w-sm flex flex-col gap-3">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-line)' }}>
          {pct === null ? (
            <div className="h-full rounded-full bar-indeterminate" style={{ background: 'var(--color-accent)' }} />
          ) : (
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--color-accent)' }} />
          )}
        </div>
        <p className="text-center t-body text-muted" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease' }}>
          {batch ? `Analysing photo ${Math.min(batch.done + 1, batch.total)} of ${batch.total}…` : LOADING_MESSAGES[msgIndex]}
        </p>
        <p className="text-center t-meta">You can switch tabs — we’ll keep working.</p>
      </div>

      <style>{`
        @keyframes logoPulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.08); opacity: 0.82 } }
        .logo-pulse { animation: logoPulse 1.6s ease-in-out infinite; }
        @keyframes barSlide { 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) } }
        .bar-indeterminate { width: 25%; animation: barSlide 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function ListPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded') === '1'
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth + profile
  const [authChecked, setAuthChecked] = useState(false)
  const [plan, setPlan] = useState<Plan>('FREE')
  const [platforms, setPlatforms] = useState<string[]>(DEFAULT_PLATFORMS)
  const [language, setLanguage] = useState<string>('en')

  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [proGate, setProGate] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [activeName, setActiveName] = useState<string | null>(null)
  const [activePreview, setActivePreview] = useState<string | null>(null)

  // Queue history (sidebar)
  const [queueHistory, setQueueHistory] = useState<HistoryItem[]>([])
  const HISTORY_KEY = 'listai_queue_history'
  const MAX_HISTORY = 5

  function loadHistory(): HistoryItem[] {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
  }
  function pushHistory(thumb: string | null, name: string, listingId?: string) {
    const existing = loadHistory()
    const entry: HistoryItem = { id: crypto.randomUUID(), thumb, name, completedAt: Date.now(), listingId }
    const next = [entry, ...existing].slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    setQueueHistory(next)
  }

  async function makeThumbnail(f: File): Promise<string> {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(f)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 80
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) { URL.revokeObjectURL(url); resolve(''); return }
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
      img.src = url
    })
  }

  useEffect(() => {
    setQueueHistory(loadHistory())
    const client = createClient()
    client.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await client.from('profiles').select('plan, platforms, language').eq('id', user.id).single()
      if (data?.plan) setPlan(data.plan as Plan)
      if (data?.platforms && data.platforms.length > 0) setPlatforms(data.platforms)
      if (data?.language) setLanguage(data.language)
      setAuthChecked(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // ── Validation ────────────────────────────────────────────────────────────────

  function validateFile(f: File): string | null {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(f.type)) return 'Please upload a JPG, PNG, or WEBP image.'
    if (f.size > 5 * 1024 * 1024) return 'Each image must be under 5MB.'
    return null
  }

  async function toDataUrl(blobOrFile: Blob): Promise<string> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blobOrFile)
    })
  }

  // ── Ingest — the single entry point for drop + picker ──────────────────────────

  function ingestFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    setError(null); setProGate(false); setRateLimited(false)

    // Validate everything up-front
    for (const f of files) {
      const err = validateFile(f)
      if (err) { setError(err); return }
    }

    if (files.length > 1 && plan === 'FREE') {
      setProGate(true)
      setError('Batch upload is a Pro feature. Drop a single photo to continue — or upgrade to Pro to list multiple items at once.')
      return
    }

    if (files.length > 1) analyzeBatch(files)
    else analyzeSingle(files[0])
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) ingestFiles(e.dataTransfer.files)
  }
  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) ingestFiles(e.target.files)
    e.target.value = ''
  }

  // ── Analyze single ─────────────────────────────────────────────────────────────

  async function analyzeSingle(file: File) {
    setLoading(true); setError(null)
    setActiveName(file.name.replace(/\.[^.]+$/, ''))
    const previewUrl = URL.createObjectURL(file)
    setActivePreview(previewUrl)
    const thumb = await makeThumbnail(file)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('platforms', JSON.stringify(platforms))
      fd.append('language', language)
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      if (res.status === 429) { setRateLimited(true); setLoading(false); return }
      if (!res.ok) {
        let msg = 'Extraction failed. Please try again.'
        try { const d = await res.json(); msg = d.error ?? msg } catch { /* ignore */ }
        setError(msg); setLoading(false); return
      }
      const listing = await res.json()
      sessionStorage.setItem('listai_listing', JSON.stringify(listing))
      sessionStorage.setItem('listai_platforms', JSON.stringify(platforms))
      sessionStorage.setItem('listai_preview', await toDataUrl(file))
      pushHistory(thumb || null, file.name.replace(/\.[^.]+$/, ''))
      router.push('/list/review')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  // ── Analyze batch (Pro) ──────────────────────────────────────────────────────

  async function analyzeBatch(files: File[]) {
    const capped = files.slice(0, 10)
    setLoading(true); setError(null)
    setBatchProgress({ done: 0, total: capped.length })
    const previews = capped.map(f => URL.createObjectURL(f))
    setActivePreview(previews[0]); setActiveName(`${capped.length} items`)

    const results = await Promise.allSettled(
      capped.map(async (f) => {
        const fd = new FormData()
        fd.append('image', f)
        fd.append('platforms', JSON.stringify(platforms))
        fd.append('language', language)
        const res = await fetch('/api/extract', { method: 'POST', body: fd })
        if (!res.ok) {
          let msg = 'Extraction failed'
          try { const d = await res.json(); msg = d.error ?? msg } catch { /* ignore */ }
          throw new Error(msg)
        }
        const listing = await res.json()
        setBatchProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null)
        return listing
      })
    )

    const dataUrls = await Promise.all(capped.map(f => toDataUrl(f)))
    const batchResults: BatchResult[] = results.map((r, i) => ({
      id: crypto.randomUUID(),
      preview: dataUrls[i],
      listing: r.status === 'fulfilled' ? r.value : null,
      status: r.status === 'fulfilled' ? 'ready' : 'failed',
      error: r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : undefined,
    }))
    sessionStorage.setItem('listai_batch_results', JSON.stringify(batchResults))
    sessionStorage.setItem('listai_platforms', JSON.stringify(platforms))
    previews.forEach(URL.revokeObjectURL)
    setLoading(false); setBatchProgress(null)
    router.push('/list/batch-review')
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (!authChecked) return <div className="min-h-screen bg-page" />

  const queueItems = loading && activePreview
    ? [{ id: '0', preview: activePreview, name: activeName ?? 'Item', status: 'processing' as const }]
    : []

  const queueSlot = (
    <SidebarQueue
      items={queueItems}
      historyItems={queueHistory}
      onAdd={() => fileInputRef.current?.click()}
      onHistoryClick={item => item.listingId ? router.push(`/list/review?id=${item.listingId}`) : router.push('/dashboard')}
    />
  )

  return (
    <AppShell queueSlot={queueSlot}>
    <div className="flex flex-col bg-page" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <header className="bg-card border-b border-line sticky top-0 z-20">
        <div className="px-4 md:px-8 flex items-center" style={{ minHeight: 57 }}>
          <div className="flex-1">
            <h1 className="t-title text-ink">New listing</h1>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-ink">1 · Upload</span>
            <span>→</span>
            <span>2 · Review</span>
          </div>
          <div className="flex-1" />
        </div>
      </header>

      {upgraded && (
        <div className="px-4 md:px-8 py-3 flex items-center gap-3" style={{ background: 'var(--color-accent-tint)', borderBottom: '1px solid #A7F3D0' }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-accent)' }} />
          <p className="text-sm font-medium" style={{ color: '#065F46' }}>Welcome to Pro! Batch upload is now unlocked.</p>
        </div>
      )}

      <main className="flex-1 flex flex-col px-4 md:px-8 py-6 md:py-10">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        {loading ? (
          <AnalyzingState batch={batchProgress} />
        ) : rateLimited ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16">
            <p className="t-display text-ink">You’ve hit today’s limit</p>
            <p className="t-body text-muted max-w-sm">You’ve used all your free extractions for now. Upgrade to Pro for more, or come back later.</p>
            <button onClick={() => router.push('/pricing')} className="mt-2 rounded-xl font-semibold text-sm text-white px-5" style={{ minHeight: 44, background: 'var(--color-accent)' }}>See plans</button>
            <button onClick={() => setRateLimited(false)} className="text-sm text-muted hover:text-ink">Dismiss</button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto gap-5">
            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
              onDrop={handleDrop}
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all text-center px-6"
              style={{
                minHeight: 320,
                border: `2px dashed ${proGate ? 'var(--color-danger)' : isDragging ? 'var(--color-accent)' : 'var(--color-line)'}`,
                background: proGate ? 'var(--color-danger-tint)' : isDragging ? 'var(--color-accent-tint)' : 'var(--color-card)',
              }}
            >
              <span
                className="flex items-center justify-center rounded-2xl transition-colors"
                style={{ width: 64, height: 64, background: isDragging ? 'var(--color-accent)' : 'var(--color-fill)', color: isDragging ? '#fff' : 'var(--color-muted)' }}
              >
                <UploadIcon />
              </span>
              <div className="flex flex-col gap-1">
                <p className="t-display text-ink">{isDragging ? 'Drop to analyse' : 'Drop a photo to start'}</p>
                <p className="t-body text-muted">Drag &amp; drop or click to browse · JPG, PNG or WEBP · up to 5MB</p>
              </div>
              <p className="t-meta">We’ll analyse it instantly and pre-fill your listing.</p>
            </div>

            {/* Error / pro gate */}
            {error && (
              <div className="w-full rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'var(--color-danger-tint)', border: '1px solid #FECACA' }}>
                <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </span>
                <div className="flex flex-col gap-2 flex-1">
                  <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>{error}</p>
                  {proGate && (
                    <button onClick={() => router.push('/pricing')} className="text-sm font-semibold w-fit rounded-lg px-3 py-1.5 text-white" style={{ background: 'var(--color-accent)' }}>
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Listing-for row — platforms from profile */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="t-meta">Listing for</span>
              <div className="flex items-center gap-1.5">
                {platforms.map(p => <PlatformLogo key={p} id={p} size={20} />)}
              </div>
              <button onClick={() => router.push('/settings')} className="t-meta underline underline-offset-2 hover:text-ink transition-colors">
                change in settings
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
    </AppShell>
  )
}

export default function ListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <ListPageInner />
    </Suspense>
  )
}
