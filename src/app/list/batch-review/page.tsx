'use client'

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppShell, { PlatformLogo } from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

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

interface BatchItemState {
  id: string
  preview: string
  listing: ListingData | null
  status: 'ready' | 'failed' | 'approved'
  error?: string
  // Editable fields (initialized from listing)
  title: string
  brand: string
  garmentType: string
  colorPrimary: string
  colorSecondary: string
  pattern: string
  size: string
  material: string
  neckline: string
  sleeveType: string
  price: number
  conditionChip: ConditionChip
  tags: string[]
  descriptions: Record<string, string>
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CONDITION_CHIPS: ConditionChip[] = ['New', 'Like new', 'Good', 'Fair']

const CONDITION_GRADE_MAP: Partial<Record<string, ConditionChip>> = {
  'New with tags': 'New',
  'Like new': 'Like new',
  'Very good': 'Good',
  'Good': 'Good',
  'Fair': 'Fair',
  'Poor': 'Fair',
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
  { id: 'mercari',       label: 'Mercari',       color: '#FF0211' },
  { id: 'leboncoin',     label: 'Leboncoin',     color: '#F56B2A' },
  { id: 'wallapop',      label: 'Wallapop',      color: '#13C1AC' },
  { id: 'kleinanzeigen', label: 'Kleinanzeigen', color: '#C4161C' },
  { id: 'allegro',       label: 'Allegro',       color: '#FF5A00' },
]

const PLATFORM_TITLE_LIMITS: Record<string, number | null> = {
  ebay: 80, vinted: 60, depop: null, poshmark: 60,
  mercari: 50, leboncoin: 70, wallapop: 70, kleinanzeigen: 70, allegro: 75,
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initItemsFromStorage(): BatchItemState[] {
  if (typeof window === 'undefined') return []
  const raw = sessionStorage.getItem('listai_batch_results')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Array<{
      id: string
      preview: string
      listing: ListingData | null
      status: string
      error?: string
    }>
    return parsed.map(item => ({
      id: item.id,
      preview: item.preview,
      listing: item.listing,
      status: item.status === 'failed' ? 'failed' : 'ready',
      error: item.error,
      title: item.listing?.title ?? '',
      brand: item.listing?.brand ?? '',
      garmentType: item.listing?.garment_type ?? '',
      colorPrimary: item.listing?.color_primary ?? '',
      colorSecondary: item.listing?.color_secondary ?? '',
      pattern: item.listing?.pattern ?? 'solid',
      size: item.listing?.size ?? '',
      material: item.listing?.material_apparent ?? '',
      neckline: item.listing?.neckline ?? '',
      sleeveType: item.listing?.sleeve_type ?? '',
      price: item.listing?.suggested_price_eur ?? 0,
      conditionChip: CONDITION_GRADE_MAP[item.listing?.condition_grade ?? ''] ?? 'Good',
      tags: item.listing?.tags ?? [],
      descriptions: item.listing?.descriptions ?? {},
    }))
  } catch {
    return []
  }
}

function parsePlatforms(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(sessionStorage.getItem('listai_platforms') ?? '[]') as string[]
  } catch {
    return []
  }
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{children}</p>
  )
}

function fieldClass(extra = '') {
  return `w-full px-3 py-2.5 rounded-lg border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors placeholder:text-muted ${extra}`.trim()
}

// Status badge for queue items
function StatusBadge({ status }: { status: BatchItemState['status'] }) {
  if (status === 'approved') {
    return (
      <span className="text-xs rounded-full px-2 py-0.5 flex items-center gap-1" style={{ background: '#D1FAE5', color: '#065F46' }}>
        <CheckIcon size={10} /> Done
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="text-xs rounded-full px-2 py-0.5" style={{ background: '#FEE2E2', color: '#991B1B' }}>Failed</span>
    )
  }
  return (
    <span className="text-xs rounded-full px-2 py-0.5" style={{ background: '#E8E3DC', color: '#8A7F72' }}>Ready</span>
  )
}

// ─── Batch complete screen ─────────────────────────────────────────────────────

function BatchCompleteScreen({ items, platforms, saving, savedCount, onNewBatch }: {
  items: BatchItemState[]
  platforms: string[]
  saving: boolean
  savedCount: number
  onNewBatch: () => void
}) {
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const approved = items.filter(it => it.status === 'approved')
  const selectedPlatforms = PLATFORMS.filter(p => platforms.includes(p.id))

  async function copyAllForPlatform(platformId: string) {
    const text = approved.map(it => `${it.title}\n\n${it.descriptions[platformId] ?? ''}`).join('\n\n---\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(prev => ({ ...prev, [platformId]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [platformId]: false })), 2000)
  }

  return (
    <AppShell>
    <div className="min-h-screen bg-page flex flex-col">
      <header className="bg-card border-b border-line sticky top-0 z-20">
        <div className="px-4 md:px-6 relative flex items-center" style={{ minHeight: 57 }}>
          <div className="flex-1">
            <button onClick={onNewBatch} className="text-sm text-muted hover:text-ink transition-colors">← New batch</button>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C47A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            <span className="font-semibold text-ink">{approved.length} listings ready</span>
          </div>
          <div className="flex-1 flex justify-end items-center gap-2">
            {saving && <span className="text-xs text-muted">Saving…</span>}
            {savedCount > 0 && !saving && (
              <span className="text-xs text-muted flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00C47A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Saved
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6 w-full">
        {/* Hero */}
        <div className="bg-card rounded-2xl border border-line p-8 text-center flex flex-col gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: '#D1FAE5' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00C47A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="text-xl font-bold text-ink">{approved.length} listing{approved.length !== 1 ? 's' : ''} ready.</h1>
          <p className="text-muted text-sm">Copy per platform below, or copy all {approved.length} for one platform at once.</p>
          {saving && <p className="text-xs text-muted mt-1">Saving to My Listings…</p>}
          {savedCount > 0 && !saving && (
            <p className="text-xs flex items-center justify-center gap-1 mt-1" style={{ color: '#00C47A' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              {savedCount} listing{savedCount !== 1 ? 's' : ''} saved to My Listings
            </p>
          )}
        </div>

        {/* Copy all per platform */}
        <div className="bg-card rounded-2xl border border-line p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Copy all for platform</p>
          <div className="flex flex-wrap gap-2">
            {selectedPlatforms.map(p => (
              <button
                key={p.id}
                onClick={() => copyAllForPlatform(p.id)}
                className="rounded-xl text-sm font-medium border transition-all px-4 flex items-center gap-2"
                style={{
                  minHeight: 44,
                  background: copied[p.id] ? '#D1FAE5' : '#FDFBF8',
                  color: copied[p.id] ? '#065F46' : '#18140F',
                  borderColor: copied[p.id] ? '#6EE7B7' : '#E8E3DC',
                }}
              >
                <PlatformLogo id={p.id} type="icon" size={16} />
                {copied[p.id] ? `✓ ${p.label}` : `Copy all for ${p.label}`}
              </button>
            ))}
          </div>
        </div>

        {/* Per-item summary */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider px-1">Individual items</p>
          {approved.map((item, i) => (
            <div key={item.id} className="bg-card border border-line rounded-2xl p-4 flex gap-4 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.preview} alt={`Item ${i + 1}`} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-line" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm truncate">{item.title || `Item ${i + 1}`}</p>
                <p className="text-muted text-xs">€{item.price} · {item.conditionChip}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPlatforms.map(p => (
                    <CopyItemPlatformButton key={p.id} item={item} platform={p} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onNewBatch}
          className="w-full rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ minHeight: 52, background: '#00C47A' }}
        >
          New batch
        </button>
      </main>
    </div>
    </AppShell>
  )
}

function CopyItemPlatformButton({ item, platform }: { item: BatchItemState; platform: { id: string; label: string; color: string } }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const desc = item.descriptions[platform.id] ?? ''
    await navigator.clipboard.writeText(`${item.title}\n\n${desc}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="rounded-lg text-xs font-medium border transition-all px-2.5 flex items-center gap-1"
      style={{
        minHeight: 28,
        background: copied ? '#D1FAE5' : '#FDFBF8',
        color: copied ? '#065F46' : '#8A7F72',
        borderColor: copied ? '#6EE7B7' : '#E8E3DC',
      }}
    >
      {!copied && <PlatformLogo id={platform.id} type="icon" size={12} />}
      {copied ? `✓ ${platform.label}` : platform.label}
    </button>
  )
}

// ─── Active item review form ───────────────────────────────────────────────────

function ReviewForm({ item, onChange }: {
  item: BatchItemState
  onChange: <K extends keyof BatchItemState>(key: K, value: BatchItemState[K]) => void
}) {
  const [tagInput, setTagInput] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)

  const brandDotColor = item.listing?.brand_confidence === 'confirmed' ? '#22c55e'
    : item.listing?.brand_confidence === 'likely' ? '#F59E0B' : '#9CA3AF'
  const brandConfidenceLabel = item.listing?.brand_confidence === 'confirmed' ? 'Confirmed'
    : item.listing?.brand_confidence === 'likely' ? 'Likely' : 'Unknown'
  const titleOver = item.title.length > 60

  function addTag() {
    const val = tagInput.trim().toLowerCase()
    if (val && !item.tags.includes(val)) onChange('tags', [...item.tags, val])
    setTagInput('')
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
  }

  if (item.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#FEE2E2' }}>
          <span style={{ color: '#991B1B', fontSize: 24 }}>✕</span>
        </div>
        <div>
          <p className="font-medium text-ink">This photo couldn&apos;t be analysed</p>
          <p className="text-muted text-sm mt-1">{item.error ?? 'Extraction failed. Try re-uploading this photo separately.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Title */}
      <div className="bg-card rounded-xl border border-line p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Title</FieldLabel>
          <span className={`text-xs ${titleOver ? 'text-red-500' : 'text-muted'}`}>{item.title.length}/60</span>
        </div>
        <textarea
          value={item.title} onChange={e => onChange('title', e.target.value)} rows={2}
          placeholder="e.g. Nike vintage windbreaker, size M"
          className={['w-full px-3 py-2.5 rounded-lg border bg-page text-ink text-sm font-semibold leading-snug focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors placeholder:text-muted placeholder:font-normal resize-none', titleOver ? 'border-red-400' : 'border-line focus:border-accent'].join(' ')}
          style={{ fontSize: 15 }}
        />
        {titleOver && <p className="text-xs text-red-500 mt-0.5">Exceeds 60 characters.</p>}
      </div>

      {/* Price */}
      <div className="bg-card rounded-xl border border-line p-4">
        <FieldLabel>Suggested price</FieldLabel>
        <div className="relative" style={{ width: 140 }}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted select-none pointer-events-none font-semibold" style={{ fontSize: 20 }}>€</span>
          <input type="number" step={0.5} min={0} value={item.price} onChange={e => onChange('price', parseFloat(e.target.value) || 0)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-line bg-page text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors" style={{ fontSize: 20 }} />
        </div>
      </div>

      {/* Brand + grid */}
      <div className="bg-card rounded-xl border border-line p-4 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel>Brand</FieldLabel>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: brandDotColor }}>
              <span className="w-2 h-2 rounded-full" style={{ background: brandDotColor }} />{brandConfidenceLabel}
            </span>
          </div>
          <input type="text" value={item.brand} onChange={e => onChange('brand', e.target.value)}
            placeholder={item.listing?.brand_confidence === 'unknown' ? "Couldn't detect" : 'Brand name'} className={fieldClass()} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>Garment type</FieldLabel><input type="text" value={item.garmentType} onChange={e => onChange('garmentType', e.target.value)} placeholder="e.g. Jacket" className={fieldClass()} /></div>
          <div><FieldLabel>Colour</FieldLabel><input type="text" value={item.colorPrimary} onChange={e => onChange('colorPrimary', e.target.value)} placeholder="Primary" className={fieldClass()} /></div>
          <div><FieldLabel>Size</FieldLabel><input type="text" value={item.size} onChange={e => onChange('size', e.target.value)} placeholder="e.g. M, W29 L30" className={fieldClass()} /></div>
          <div><FieldLabel>Secondary colour</FieldLabel><input type="text" value={item.colorSecondary} onChange={e => onChange('colorSecondary', e.target.value)} placeholder="Optional" className={fieldClass()} /></div>
        </div>
      </div>

      {/* Condition */}
      <div className="bg-card rounded-xl border border-line p-4 flex flex-col gap-3">
        <FieldLabel>Condition</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {CONDITION_CHIPS.map(chip => {
            const active = item.conditionChip === chip
            return (
              <button key={chip} onClick={() => onChange('conditionChip', chip)}
                className="rounded-lg text-sm font-medium border transition-all"
                style={{ minHeight: 40, background: active ? '#00C47A' : '#F8F9FA', color: active ? '#FFFFFF' : '#6B7280', borderColor: active ? '#00C47A' : '#E5E7EB' }}>
                {chip}
              </button>
            )
          })}
        </div>
        {item.listing?.condition_needs_review && <p className="text-xs text-muted italic">AI wasn&apos;t sure — pick the right condition</p>}
        {item.listing && item.listing.condition_signals.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {item.listing.condition_signals.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-muted flex-shrink-0" />{s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* More details */}
      <div className="bg-card rounded-xl border border-line overflow-hidden">
        <button onClick={() => setMoreOpen(o => !o)} className="w-full flex items-center justify-between px-4 text-ink hover:bg-page transition-colors" style={{ minHeight: 48 }}>
          <span className="text-sm font-medium">More details</span>
          <span className="text-muted"><ChevronIcon open={moreOpen} /></span>
        </button>
        {moreOpen && (
          <div className="px-4 pb-4 border-t border-line pt-4 grid grid-cols-2 gap-3">
            <div><FieldLabel>Pattern</FieldLabel>
              <select value={item.pattern} onChange={e => onChange('pattern', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors appearance-none">
                {PATTERNS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><FieldLabel>Material</FieldLabel><input type="text" value={item.material} onChange={e => onChange('material', e.target.value)} placeholder="e.g. 100% cotton" className={fieldClass()} /></div>
            <div><FieldLabel>Neckline</FieldLabel><input type="text" value={item.neckline} onChange={e => onChange('neckline', e.target.value)} placeholder="e.g. V-neck" className={fieldClass()} /></div>
            <div><FieldLabel>Sleeve type</FieldLabel><input type="text" value={item.sleeveType} onChange={e => onChange('sleeveType', e.target.value)} placeholder="e.g. Long sleeve" className={fieldClass()} /></div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-card rounded-xl border border-line p-4">
        <FieldLabel>Tags</FieldLabel>
        <div className="flex flex-wrap gap-2 mt-1">
          {item.tags.map(tag => (
            <button key={tag} onClick={() => onChange('tags', item.tags.filter(t => t !== tag))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-line text-ink hover:border-red-300 hover:text-red-500 transition-colors">
              {tag} <span className="opacity-40">×</span>
            </button>
          ))}
          <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey}
            placeholder="Add tag…" className="px-2.5 py-1 rounded-lg border border-line bg-page text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors placeholder:text-muted" style={{ minWidth: 90 }} />
        </div>
      </div>
    </div>
  )
}

// ─── Right column: platform tabbed editor ──────────────────────────────────────

function PlatformEditor({ item, platforms, onChange }: {
  item: BatchItemState
  platforms: string[]
  onChange: <K extends keyof BatchItemState>(key: K, value: BatchItemState[K]) => void
}) {
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const selectedPlatforms = PLATFORMS.filter(p => platforms.includes(p.id))

  useEffect(() => {
    if (selectedPlatforms.length > 0 && !activePlatform) setActivePlatform(selectedPlatforms[0].id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatforms.length])

  // Reset active platform when switching items
  useEffect(() => {
    if (selectedPlatforms.length > 0) setActivePlatform(selectedPlatforms[0].id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  async function copyPlatform(platformId: string, platformLabel: string) {
    const limit = PLATFORM_TITLE_LIMITS[platformId]
    const text = limit !== null ? `${item.title}\n\n${item.descriptions[platformId] ?? ''}` : (item.descriptions[platformId] ?? '')
    await navigator.clipboard.writeText(text)
    setCopied(prev => ({ ...prev, [platformId]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [platformId]: false })), 2000)
    void platformLabel
  }

  if (selectedPlatforms.length === 0) return null

  const activeMeta = selectedPlatforms.find(p => p.id === activePlatform)

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-line bg-page flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
        {selectedPlatforms.map(p => {
          const isActive = activePlatform === p.id
          const limit = PLATFORM_TITLE_LIMITS[p.id]
          const tabSub = limit === null ? 'No title' : `${item.title.length} / ${limit}`
          return (
            <button key={p.id} onClick={() => setActivePlatform(p.id)}
              className="flex flex-col items-start px-3 py-2 flex-shrink-0 border-b-2 transition-all"
              style={{ borderBottomColor: isActive ? p.color : 'transparent', background: isActive ? '#FDFBF8' : 'transparent', minWidth: 72 }}>
              <PlatformLogo id={p.id} type="logo" size={16} />
              <span className="text-[10px] text-muted mt-1 whitespace-nowrap">{tabSub}</span>
            </button>
          )
        })}
      </div>

      {/* Active platform editor */}
      {activeMeta && (
        <div className="flex flex-col flex-1 overflow-y-auto" style={{ borderTop: `3px solid ${activeMeta.color}` }}>
          <div className="flex flex-col gap-4 p-4 flex-1">
            {PLATFORM_TITLE_LIMITS[activeMeta.id] !== null && (
              <div className="bg-card rounded-xl border border-line p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">Title Editor</p>
                  <span className={`text-xs ${item.title.length > (PLATFORM_TITLE_LIMITS[activeMeta.id] ?? 999) ? 'text-red-500' : 'text-muted'}`}>
                    {item.title.length}/{PLATFORM_TITLE_LIMITS[activeMeta.id]}
                  </span>
                </div>
                <textarea
                  value={item.title}
                  onChange={e => onChange('title', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-line bg-page text-ink text-sm font-medium leading-snug focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors resize-none"
                  placeholder={`${activeMeta.label} title…`}
                />
                <p className="text-xs text-muted">{activeMeta.label} Title</p>
              </div>
            )}

            <div className="bg-card rounded-xl border border-line p-3 flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Description Editor</p>
                <span className="text-xs text-muted">{(item.descriptions[activeMeta.id] ?? '').length}</span>
              </div>
              <textarea
                value={item.descriptions[activeMeta.id] ?? ''}
                onChange={e => onChange('descriptions', { ...item.descriptions, [activeMeta.id]: e.target.value })}
                className="w-full flex-1 px-3 py-2 rounded-lg border border-line bg-page text-ink text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors resize-none placeholder:text-muted"
                style={{ minHeight: 180 }}
                placeholder={`${activeMeta.label} description…`}
              />
              <p className="text-xs text-muted">{activeMeta.label} Description</p>
            </div>
          </div>

          <div className="px-4 pb-4 flex-shrink-0">
            <button
              onClick={() => copyPlatform(activeMeta.id, activeMeta.label)}
              className="w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ minHeight: 48, background: copied[activeMeta.id] ? '#D1FAE5' : activeMeta.color, color: copied[activeMeta.id] ? '#065F46' : '#FFFFFF' }}
            >
              {copied[activeMeta.id] ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Copied</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy {activeMeta.label} Details</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BatchReviewPage() {
  const router = useRouter()

  const [items, setItems] = useState<BatchItemState[]>(initItemsFromStorage)
  const [platforms] = useState<string[]>(parsePlatforms)
  const [activeIndex, setActiveIndex] = useState(0)
  const [batchDone, setBatchDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const saveStarted = useRef(false)

  // Redirect if no items
  useEffect(() => {
    if (items.length === 0) router.replace('/list')
  }, [items.length, router])

  // Skip failed items on initial load
  useEffect(() => {
    if (items.length > 0 && items[0].status === 'failed') {
      const firstReady = items.findIndex(it => it.status !== 'failed')
      if (firstReady > 0) setActiveIndex(firstReady)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Spacebar to approve and advance
  const approveAndNext = useCallback(() => {
    setItems(prev => {
      const updated = prev.map((it, i) =>
        i === activeIndex && it.status === 'ready' ? { ...it, status: 'approved' as const } : it
      )
      // Find next non-approved, non-failed item
      const nextIdx = updated.findIndex((it, i) => i > activeIndex && it.status === 'ready')
      if (nextIdx !== -1) {
        setActiveIndex(nextIdx)
      } else {
        // Check if all approvable items are done
        const allDone = updated.every(it => it.status === 'approved' || it.status === 'failed')
        if (allDone) setBatchDone(true)
      }
      return updated
    })
  }, [activeIndex])

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        approveAndNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [approveAndNext])

  function updateField<K extends keyof BatchItemState>(key: K, value: BatchItemState[K]) {
    setItems(prev => prev.map((it, i) => i === activeIndex ? { ...it, [key]: value } : it))
  }

  async function saveBatch(approvedItems: BatchItemState[]) {
    if (saveStarted.current) return
    saveStarted.current = true
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    let count = 0
    for (const item of approvedItems) {
      try {
        let image_url: string | null = null
        if (item.preview.startsWith('blob:') || item.preview.startsWith('data:')) {
          try {
            let blob: Blob
            if (item.preview.startsWith('blob:')) {
              blob = await fetch(item.preview).then(r => r.blob())
            } else {
              const [meta, b64] = item.preview.split(',')
              const mimeType = meta.split(';')[0].split(':')[1]
              const bytes = atob(b64)
              const arr = new Uint8Array(bytes.length)
              for (let j = 0; j < bytes.length; j++) arr[j] = bytes.charCodeAt(j)
              blob = new Blob([arr], { type: mimeType })
            }
            const mimeType = blob.type || 'image/jpeg'
            const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
            const { data: up } = await supabase.storage.from('listing-images').upload(`${crypto.randomUUID()}.${ext}`, blob, { contentType: mimeType })
            if (up) {
              const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(up.path)
              image_url = urlData.publicUrl
            }
          } catch { /* non-fatal */ }
        }
        await supabase.from('listings').insert({ listing_data: item.listing, platforms, title: item.title, image_url, status: 'draft', user_id: user.id })
        count++
      } catch { /* skip failed item */ }
    }
    setSaving(false)
    setSavedCount(count)
  }

  // Auto-save when batch is marked done
  useEffect(() => {
    if (!batchDone) return
    const approved = items.filter(it => it.status === 'approved')
    if (approved.length > 0) saveBatch(approved)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchDone])

  function handleNewBatch() {
    sessionStorage.removeItem('listai_batch_results')
    router.push('/list')
  }

  if (items.length === 0) {
    return <div className="min-h-screen bg-page" />
  }

  if (batchDone) {
    return (
      <BatchCompleteScreen
        items={items}
        platforms={platforms}
        saving={saving}
        savedCount={savedCount}
        onNewBatch={handleNewBatch}
      />
    )
  }

  const activeItem = items[activeIndex]
  const approvedCount = items.filter(it => it.status === 'approved').length
  const readyCount = items.filter(it => it.status === 'ready').length

  return (
    <AppShell>
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header className="bg-card border-b border-line sticky top-0 z-20">
        <div className="px-4 md:px-6 relative flex items-center" style={{ minHeight: 57 }}>
          <div className="flex-1">
            <button onClick={handleNewBatch} className="text-sm text-muted hover:text-ink transition-colors">← New batch</button>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 text-xs text-muted">
            <button onClick={() => setActiveIndex(i => Math.max(0, i - 1))} disabled={activeIndex === 0}
              className="px-2 rounded border border-line hover:border-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors" style={{ minHeight: 28 }}>←</button>
            <span>{approvedCount} approved · {readyCount} remaining</span>
            <button onClick={() => setActiveIndex(i => Math.min(items.length - 1, i + 1))} disabled={activeIndex === items.length - 1}
              className="px-2 rounded border border-line hover:border-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors" style={{ minHeight: 28 }}>→</button>
          </div>
          <div className="flex-1 flex justify-end items-center gap-3">
            {saving && <span className="text-xs text-muted">Saving…</span>}
            {savedCount > 0 && !saving && (
              <span className="text-xs text-muted flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00C47A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Saved
              </span>
            )}
            <button onClick={() => setBatchDone(true)} className="text-sm text-muted hover:text-ink transition-colors">Finish →</button>
          </div>
        </div>
      </header>

      {/* Mobile: thumbnail strip */}
      <div className="lg:hidden bg-card border-b border-line px-4 py-3 overflow-x-auto">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {items.map((item, i) => (
            <button key={item.id} onClick={() => setActiveIndex(i)}
              className="flex-shrink-0 relative rounded-xl overflow-hidden border-2 transition-all"
              style={{ width: 56, height: 56, borderColor: i === activeIndex ? '#00C47A' : item.status === 'approved' ? '#6EE7B7' : item.status === 'failed' ? '#fca5a5' : '#E8E3DC' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.preview} alt={`Item ${i + 1}`} className="w-full h-full object-cover" />
              {item.status === 'approved' && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(209,250,229,0.8)' }}>
                  <span style={{ color: '#065F46', fontSize: 16 }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3-column desktop layout ── */}
      <div className="hidden lg:grid lg:grid-cols-[220px_1fr_380px]" style={{ height: 'calc(100vh - 57px)' }}>

        {/* LEFT — item queue + active photo */}
        <aside className="flex flex-col border-r border-line bg-card overflow-y-auto">
          {/* Active item photo */}
          <div className="flex-shrink-0">
            <div className="overflow-hidden border-b border-line" style={{ background: '#F7F4EF' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeItem.preview} alt="Active item" className="w-full object-cover" style={{ maxHeight: 260 }} />
            </div>
            {/* Photo quality / confidence warnings */}
            {activeItem.listing && activeItem.listing.photo_quality !== 'good' && (
              <div className="mx-3 mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: '#FFFBEB', color: '#92400E' }}>
                <WarningIcon />
                <p className="text-xs font-medium leading-snug">
                  {activeItem.listing.photo_quality === 'needs_retake' ? 'Photo too unclear — check all fields.' : 'Some details might be off.'}
                </p>
              </div>
            )}
            {activeItem.listing && activeItem.listing.overall_confidence < 0.4 && (
              <div className="mx-3 mt-2 rounded-lg px-3 py-2" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                <span className="text-xs" style={{ color: '#92400E' }}>Low confidence — check all fields</span>
              </div>
            )}
          </div>

          {/* Queue list */}
          <div className="p-3 flex flex-col gap-2 flex-1">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider px-1 mb-1">{items.length} photo{items.length !== 1 ? 's' : ''}</p>
            {items.map((item, i) => (
              <button key={item.id} onClick={() => setActiveIndex(i)}
                className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-all border-2"
                style={{ borderColor: i === activeIndex ? '#00C47A' : 'transparent', background: i === activeIndex ? '#F0FDF4' : 'transparent' }}>
                <div className="relative flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 40, height: 40 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt={`Item ${i + 1}`} className="w-full h-full object-cover" />
                  {item.status === 'approved' && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(209,250,229,0.8)' }}>
                      <span style={{ color: '#065F46', fontSize: 12 }}>✓</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink truncate">{item.title || `Photo ${i + 1}`}</p>
                  <StatusBadge status={item.status} />
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* CENTER — editable fields (photo lives in left col) */}
        <main className="overflow-y-auto border-r border-line">
          <div className="px-5 py-5 flex flex-col gap-4" style={{ paddingBottom: '6rem' }}>
            <ReviewForm key={activeItem.id} item={activeItem} onChange={updateField} />
          </div>
        </main>

        {/* RIGHT — platform tabbed editor */}
        <aside className="flex flex-col overflow-hidden">
          <PlatformEditor key={activeItem.id} item={activeItem} platforms={platforms} onChange={updateField} />
        </aside>
      </div>

      {/* Mobile: single-column content */}
      <div className="lg:hidden flex flex-col" style={{ paddingBottom: '5rem' }}>
        <div className="overflow-hidden border-b border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeItem.preview} alt="Active item" className="w-full object-cover" style={{ maxHeight: 280 }} />
        </div>
        <div className="px-4 py-4 flex flex-col gap-4">
          <ReviewForm key={activeItem.id} item={activeItem} onChange={updateField} />
          <PlatformEditor key={`m-${activeItem.id}`} item={activeItem} platforms={platforms} onChange={updateField} />
        </div>
      </div>

      {/* Sticky bottom bar — approve button only */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-line px-4 py-3">
        <div className="flex justify-end max-w-none">
          <button onClick={approveAndNext} disabled={activeItem.status !== 'ready'}
            className="rounded-xl font-semibold transition-all"
            style={{ minHeight: 48, background: activeItem.status === 'approved' ? '#E8E3DC' : '#00C47A', color: activeItem.status === 'approved' ? '#8A7F72' : '#FFFFFF', cursor: activeItem.status !== 'ready' ? 'default' : 'pointer', padding: '0 32px' }}>
            {activeItem.status === 'approved' ? '✓ Approved' : activeIndex === items.length - 1 ? 'Approve & finish' : 'Approve & next →'}
          </button>
        </div>
      </div>
    </div>
    </AppShell>
  )
}
