'use client'

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'
import AppShell from '@/components/AppShell'

interface ListingData {
  gender: string
  category: string
  garment_type: string
  neckline: string | null
  sleeve_type: string | null
  silhouette: string[]
  brand: string | null
  brand_confidence: 'confirmed' | 'likely' | 'unknown'
  brand_source: string | null
  color_primary: string
  color_secondary: string | null
  pattern: string
  size: string | null
  material_apparent: string | null
  condition_signals: string[]
  condition_grade: string
  condition_confidence: 'high' | 'medium' | 'low'
  condition_needs_review: boolean
  title: string
  suggested_price_eur: number
  tags: string[]
  descriptions: Record<string, string>
  photo_quality: 'good' | 'needs_second_photo' | 'needs_retake'
  photo_issue: string | null
  photo_fix: string | null
  overall_confidence: number
}

type ConditionChip = 'New' | 'Like new' | 'Good' | 'Fair'
type LoadState = 'loading' | 'ready' | 'empty'

const CONDITION_CHIPS: ConditionChip[] = ['New', 'Like new', 'Good', 'Fair']

const CONDITION_GRADE_MAP: Partial<Record<string, ConditionChip>> = {
  'New with tags': 'New',
  'Like new': 'Like new',
  'Very good': 'Good',
  'Good': 'Good',
  'Fair': 'Fair',
  'Poor': 'Fair',
}

function cap(s: string | null | undefined) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const PATTERNS = [
  'solid', 'striped', 'floral', 'plaid', 'graphic',
  'monogram', 'logo', 'tie-dye', 'animal', 'geometric', 'other',
]

const PLATFORMS = [
  { id: 'ebay',          label: 'eBay',          color: '#E53238' },
  { id: 'vinted',        label: 'Vinted',        color: '#007782' },
  { id: 'depop',         label: 'Depop',         color: '#FF4040' },
  { id: 'poshmark',      label: 'Poshmark',      color: '#C4375E' },
  { id: 'leboncoin',     label: 'Leboncoin',     color: '#F56B2A' },
  { id: 'wallapop',      label: 'Wallapop',      color: '#13C1AC' },
  { id: 'kleinanzeigen', label: 'Kleinanzeigen', color: '#C4161C' },
  { id: 'allegro',       label: 'Allegro',       color: '#FF5A00' },
]

function WarningIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{children}</p>
  )
}

function Input({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2.5 rounded-lg border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors placeholder:text-muted ${className}`}
    />
  )
}

function ReviewPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sourceId = searchParams.get('id')

  const [listing, setListing] = useState<ListingData | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const autoSaveStarted = useRef(false)

  // Form state
  const [title, setTitle] = useState('')
  const [brand, setBrand] = useState('')
  const [garmentType, setGarmentType] = useState('')
  const [colorPrimary, setColorPrimary] = useState('')
  const [colorSecondary, setColorSecondary] = useState('')
  const [pattern, setPattern] = useState('solid')
  const [size, setSize] = useState('')
  const [material, setMaterial] = useState('')
  const [neckline, setNeckline] = useState('')
  const [sleeveType, setSleeveType] = useState('')
  const [price, setPrice] = useState(0)
  const [conditionChip, setConditionChip] = useState<ConditionChip>('Good')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})

  // UI state
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false)
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const [toastText, setToastText] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [lastCopiedPlatform, setLastCopiedPlatform] = useState('')

  const firstCopyDone = useRef(false)
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function initForm(data: ListingData, platformList: string[], preview: string | null) {
    setListing(data)
    setPlatforms(platformList)
    setPreviewUrl(preview)
    setTitle(data.title ?? '')
    setBrand(cap(data.brand))
    setGarmentType(cap(data.garment_type))
    setColorPrimary(cap(data.color_primary))
    setColorSecondary(cap(data.color_secondary))
    setPattern(data.pattern ?? 'solid')
    setSize(data.size ?? '')
    setMaterial(cap(data.material_apparent))
    setNeckline(cap(data.neckline))
    setSleeveType(cap(data.sleeve_type))
    setPrice(data.suggested_price_eur ?? 0)
    setConditionChip(CONDITION_GRADE_MAP[data.condition_grade ?? ''] ?? 'Good')
    setTags(data.tags ?? [])
    setDescriptions(data.descriptions ?? {})
    setLoadState('ready')
  }

  useEffect(() => {
    async function load() {
      if (sourceId) {
        const supabase = createClient()
        const { data } = await supabase.from('listings').select('*').eq('id', sourceId).single()
        if (!data) { router.replace('/list'); return }
        setSavedId(data.id as string)
        initForm(data.listing_data as ListingData, data.platforms as string[], data.image_url as string | null)
      } else {
        const raw = sessionStorage.getItem('listai_listing')
        if (!raw) { setLoadState('empty'); return }
        try {
          const data = JSON.parse(raw) as ListingData
          const platformList = JSON.parse(sessionStorage.getItem('listai_platforms') ?? '[]') as string[]
          const preview = sessionStorage.getItem('listai_preview')
          const existingSavedId = sessionStorage.getItem('listai_listing_id')
          if (existingSavedId) setSavedId(existingSavedId)
          initForm(data, platformList, preview)
        } catch { setLoadState('empty') }
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId])

  useEffect(() => { if (loadState === 'empty') router.replace('/list') }, [loadState, router])
  useEffect(() => { return () => { if (modalTimerRef.current) clearTimeout(modalTimerRef.current) } }, [])

  const saveToDb = useCallback(async (overrideTitle?: string) => {
    if (!listing) return null
    setSaving(true)
    try {
      const supabase = createClient()
      let image_url: string | null = null
      if (previewUrl && previewUrl.startsWith('data:')) {
        try {
          const [meta, base64Data] = previewUrl.split(',')
          const mimeType = meta.split(';')[0].split(':')[1]
          const byteCharacters = atob(base64Data)
          const byteArray = new Uint8Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i)
          const blob = new Blob([byteArray], { type: mimeType })
          const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
          const { data: uploadData } = await supabase.storage.from('listing-images').upload(`${crypto.randomUUID()}.${ext}`, blob, { contentType: mimeType })
          if (uploadData) {
            const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(uploadData.path)
            image_url = urlData.publicUrl
          }
        } catch { /* non-fatal */ }
      } else if (previewUrl?.startsWith('http')) {
        image_url = previewUrl
      }
      const payload = { listing_data: listing, platforms, title: overrideTitle ?? title, image_url, status: 'draft' }
      let id: string | null = null
      if (savedId) {
        const { data } = await supabase.from('listings').update(payload).eq('id', savedId).select('id').single()
        id = data?.id ?? savedId
      } else {
        const { data } = await supabase.from('listings').insert(payload).select('id').single()
        id = data?.id ?? null
      }
      if (id) { setSavedId(id); sessionStorage.setItem('listai_listing_id', id) }
      return id
    } finally { setSaving(false) }
  }, [listing, platforms, title, previewUrl, savedId])

  useEffect(() => {
    if (loadState !== 'ready' || savedId || autoSaveStarted.current || sourceId) return
    autoSaveStarted.current = true
    saveToDb()
  }, [loadState, savedId, sourceId, saveToDb])

  function showToast(text: string) {
    setToastText(text); setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2000)
  }

  function addTag() {
    const val = tagInput.trim().toLowerCase()
    if (val && !tags.includes(val)) setTags(prev => [...prev, val])
    setTagInput('')
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
  }

  async function copyPlatform(platformId: string, platformLabel: string) {
    await navigator.clipboard.writeText(`${title}\n\n${descriptions[platformId] ?? ''}`)
    setCopied(prev => ({ ...prev, [platformId]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [platformId]: false })), 2000)
    showToast(`Copied — ready to paste into ${platformLabel}`)
    if (!firstCopyDone.current) {
      firstCopyDone.current = true
      setLastCopiedPlatform(platformLabel)
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current)
      modalTimerRef.current = setTimeout(() => setShowModal(true), 1500)
    }
  }

  async function copyAll() {
    const selected = PLATFORMS.filter(p => platforms.includes(p.id))
    const text = selected.map(p => `${p.label.toUpperCase()}\n${title}\n\n${descriptions[p.id] ?? ''}`).join('\n\n---\n\n')
    await navigator.clipboard.writeText(text)
    firstCopyDone.current = true
    setLastCopiedPlatform(selected[0]?.label ?? '')
    setShowModal(true)
  }

  async function handleNewPhoto() {
    sessionStorage.setItem('listai_saved_platforms', JSON.stringify(platforms))
    sessionStorage.removeItem('listai_listing_id')
    await saveToDb(title)
    router.push('/list')
  }

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }
  if (!listing) return null

  const selectedPlatforms = PLATFORMS.filter(p => platforms.includes(p.id))
  const showBanner = listing.photo_quality !== 'good' && !bannerDismissed
  const titleOver = title.length > 60
  const brandDotColor = listing.brand_confidence === 'confirmed' ? '#22c55e'
    : listing.brand_confidence === 'likely' ? '#F59E0B' : '#9CA3AF'
  const brandConfidenceLabel = listing.brand_confidence === 'confirmed' ? 'Confirmed'
    : listing.brand_confidence === 'likely' ? 'Likely' : 'Unknown'

  return (
    <>
    <AppShell>
    <div className="min-h-screen bg-page pb-20 md:pb-0">

      {/* ── Sticky header ── */}
      <header className="bg-card border-b border-line sticky top-0 z-20">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-muted hover:text-ink transition-colors flex items-center gap-1.5"
            style={{ minHeight: 44 }}
          >
            ← My listings
          </button>
          <div className="flex items-center gap-4">
            {saving && <span className="text-xs text-muted">Saving…</span>}
            {savedId && !saving && (
              <span className="text-xs text-muted flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00C47A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved
              </span>
            )}
            <div className="text-xs text-muted flex items-center gap-1.5">
              <span>1 · Upload</span>
              <span>→</span>
              <span className="text-ink font-semibold">2 · Review</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Three-column workspace ── */}
      <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr_320px] lg:items-start gap-0 h-full">

        {/* ════ LEFT COLUMN — display only ════ */}
        <div className="lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-line p-4 flex flex-col gap-4">

          {/* Photo */}
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-line bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Item photo" className="w-full object-cover" style={{ maxHeight: 320 }} />
            </div>
          )}

          {/* Photo quality warning */}
          {showBanner && (
            <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: '#FFFBEB' }}>
              <div className="flex items-start gap-2" style={{ color: '#92400E' }}>
                <WarningIcon />
                <p className="text-xs font-medium leading-snug">
                  {listing.photo_quality === 'needs_retake'
                    ? "Photo too unclear — retake for better results."
                    : 'Some details might be off. A clearer photo would help.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => router.push('/list')} className="flex-1 rounded-lg text-xs font-medium" style={{ background: '#92400E', color: '#FFFBEB', minHeight: 36 }}>
                  Retake
                </button>
                <button onClick={() => setBannerDismissed(true)} className="flex-1 rounded-lg text-xs font-medium border" style={{ borderColor: '#92400E', color: '#92400E', minHeight: 36 }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Low confidence pill */}
          {listing.overall_confidence < 0.4 && (
            <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
              <span className="text-xs" style={{ color: '#92400E' }}>Low confidence — check all fields</span>
            </div>
          )}

          {/* Spacer on desktop so left col feels anchored */}
          <div className="hidden lg:block flex-1" />
        </div>

        {/* ════ CENTER COLUMN — all editable fields ════ */}
        <div className="flex flex-col gap-4 p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-line">

          {/* Title */}
          <div className="bg-card rounded-xl border border-line p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-1">
              <Label>Title</Label>
              <span className={`text-xs ${titleOver ? 'text-red-500' : 'text-muted'}`}>{title.length}/60</span>
            </div>
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              rows={2}
              placeholder="e.g. Levi's 501 vintage denim jacket, size M"
              className={[
                'w-full px-3 py-2.5 rounded-lg border bg-page text-ink text-sm font-semibold leading-snug focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors placeholder:text-muted placeholder:font-normal resize-none',
                titleOver ? 'border-red-400' : 'border-line focus:border-accent',
              ].join(' ')}
              style={{ fontSize: 15 }}
            />
            {titleOver && <p className="text-xs text-red-500 mt-0.5">Exceeds 60 characters — some platforms may truncate.</p>}
          </div>

          {/* Price */}
          <div className="bg-card rounded-xl border border-line p-4">
            <Label>Suggested price</Label>
            <div className="relative" style={{ width: 140 }}>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted select-none pointer-events-none font-semibold" style={{ fontSize: 20 }}>€</span>
              <input
                type="number" step={0.5} min={0} value={price}
                onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-line bg-page text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                style={{ fontSize: 20 }}
              />
            </div>
          </div>

          {/* Brand + core grid */}
          <div className="bg-card rounded-xl border border-line p-4 flex flex-col gap-4">

            {/* Brand */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Brand</Label>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: brandDotColor }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: brandDotColor }} />
                  {brandConfidenceLabel}
                </span>
              </div>
              <Input value={brand} onChange={setBrand} placeholder={listing.brand_confidence === 'unknown' ? "Couldn't detect" : 'Brand name'} />
            </div>

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Garment type</Label>
                <Input value={garmentType} onChange={setGarmentType} placeholder="e.g. Jacket" />
              </div>
              <div>
                <Label>Colour</Label>
                <Input value={colorPrimary} onChange={setColorPrimary} placeholder="Primary colour" />
              </div>
              <div>
                <Label>Size</Label>
                <Input value={size} onChange={setSize} placeholder="e.g. M, W29 L30" />
              </div>
              <div>
                <Label>Secondary colour</Label>
                <Input value={colorSecondary} onChange={setColorSecondary} placeholder="Optional" />
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="bg-card rounded-xl border border-line p-4 flex flex-col gap-3">
            <Label>Condition</Label>
            <div className="grid grid-cols-4 gap-2">
              {CONDITION_CHIPS.map(chip => {
                const active = conditionChip === chip
                return (
                  <button
                    key={chip}
                    onClick={() => setConditionChip(chip)}
                    className="rounded-lg text-sm font-medium border transition-all"
                    style={{
                      minHeight: 40,
                      background: active ? '#00C47A' : '#F8F9FA',
                      color: active ? '#FFFFFF' : '#6B7280',
                      borderColor: active ? '#00C47A' : '#E5E7EB',
                    }}
                  >
                    {chip}
                  </button>
                )
              })}
            </div>
            {listing.condition_needs_review && (
              <p className="text-xs text-muted italic">AI wasn&apos;t sure — tap the condition that looks right</p>
            )}
            {listing.condition_signals.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">AI spotted</p>
                <ul className="flex flex-col gap-1.5">
                  {listing.condition_signals.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-muted flex-shrink-0" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* More details — accordion */}
          <div className="bg-card rounded-xl border border-line overflow-hidden">
            <button
              onClick={() => setMoreDetailsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 text-ink hover:bg-page transition-colors"
              style={{ minHeight: 48 }}
            >
              <span className="text-sm font-medium">More details</span>
              <span className="text-muted"><ChevronIcon open={moreDetailsOpen} /></span>
            </button>
            {moreDetailsOpen && (
              <div className="px-4 pb-4 border-t border-line pt-4 grid grid-cols-2 gap-3">
                <div>
                  <Label>Pattern</Label>
                  <select
                    value={pattern} onChange={e => setPattern(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors appearance-none"
                  >
                    {PATTERNS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Material</Label>
                  <Input value={material} onChange={setMaterial} placeholder="e.g. 100% cotton" />
                </div>
                <div>
                  <Label>Neckline</Label>
                  <Input value={neckline} onChange={setNeckline} placeholder="e.g. V-neck" />
                </div>
                <div>
                  <Label>Sleeve type</Label>
                  <Input value={sleeveType} onChange={setSleeveType} placeholder="e.g. Long sleeve" />
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-card rounded-xl border border-line p-4">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-line text-ink hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  {tag} <span className="opacity-40">×</span>
                </button>
              ))}
              <input
                type="text" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                placeholder="Add tag…"
                className="px-2.5 py-1 rounded-lg border border-line bg-page text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors placeholder:text-muted"
                style={{ minWidth: 90 }}
              />
            </div>
          </div>

          {/* Mobile — platform descriptions here */}
          {selectedPlatforms.length > 0 && (
            <div className="lg:hidden flex flex-col gap-3">
              <Label>Platform descriptions</Label>
              {selectedPlatforms.map(p => (
                <PlatformCard key={p.id} platform={p} title={title} description={descriptions[p.id] ?? ''} copied={!!copied[p.id]} onCopy={() => copyPlatform(p.id, p.label)} onChange={v => setDescriptions(prev => ({ ...prev, [p.id]: v }))} />
              ))}
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN — platform output deck ════ */}
        {selectedPlatforms.length > 0 && (
          <div className="hidden lg:flex flex-col gap-4 p-4 lg:p-5 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Platform descriptions</p>
              <button onClick={copyAll} className="text-xs font-medium text-muted hover:text-ink transition-colors">Copy all</button>
            </div>
            {selectedPlatforms.map(p => (
              <PlatformCard key={p.id} platform={p} title={title} description={descriptions[p.id] ?? ''} copied={!!copied[p.id]} onCopy={() => copyPlatform(p.id, p.label)} onChange={v => setDescriptions(prev => ({ ...prev, [p.id]: v }))} />
            ))}
          </div>
        )}

      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-line px-4 py-3">
        <button onClick={copyAll} className="w-full rounded-xl font-semibold text-white" style={{ minHeight: 52, background: '#00C47A' }}>
          Copy all & done
        </button>
      </div>

      {/* Toast */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-ink text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none"
        style={{ bottom: '5rem', opacity: toastVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}
      >
        {toastText}
      </div>

    </div>
    </AppShell>

    {/* End-of-flow modal */}
    {showModal && (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={() => setShowModal(false)} />
        <div className="relative bg-card rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-sm md:mx-4 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Item" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-line" />
            )}
            <div>
              <p className="font-semibold text-ink text-sm">Ready to paste into {lastCopiedPlatform}.</p>
              <p className="text-muted text-sm">What next?</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={handleNewPhoto} className="w-full rounded-xl font-semibold text-white text-sm" style={{ minHeight: 52, background: '#1E2022' }}>
              New photo
            </button>
            <button onClick={() => router.push('/dashboard')} className="w-full rounded-xl font-medium text-ink border border-line text-sm hover:border-muted transition-colors" style={{ minHeight: 52 }}>
              My listings
            </button>
            <button onClick={() => setShowModal(false)} className="w-full rounded-xl font-medium text-muted text-sm" style={{ minHeight: 44 }}>
              Keep editing
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function PlatformCard({ platform, title, description, copied, onCopy, onChange }: {
  platform: { id: string; label: string; color: string }
  title: string
  description: string
  copied: boolean
  onCopy: () => void
  onChange: (v: string) => void
}) {
  return (
    <div
      className="bg-card rounded-xl border border-line overflow-hidden flex flex-col"
      style={{ borderLeft: `4px solid ${platform.color}` }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-line">
        <span className="font-bold text-base text-ink leading-none" style={{ fontFamily: 'var(--font-header)' }}>
          {platform.label}
        </span>
        <button
          onClick={onCopy}
          className="flex-shrink-0 rounded-lg text-xs font-semibold px-4 transition-all"
          style={{
            minHeight: 36,
            background: copied ? '#D1FAE5' : platform.color,
            color: copied ? '#065F46' : '#FFFFFF',
          }}
        >
          {copied ? 'Copied ✓' : 'Copy Details'}
        </button>
      </div>

      {/* Title preview */}
      {title && (
        <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted truncate border-b border-line">
          {title}
        </p>
      )}

      {/* Editable description */}
      <textarea
        value={description}
        onChange={e => onChange(e.target.value)}
        rows={5}
        className="w-full px-4 py-3 bg-card text-ink text-sm leading-relaxed focus:outline-none resize-none placeholder:text-muted"
        placeholder={`${platform.label} description…`}
      />
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    }>
      <ReviewPageInner />
    </Suspense>
  )
}
