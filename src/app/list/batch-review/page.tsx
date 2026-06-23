'use client'

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
  { id: 'ebay', label: 'eBay' },
  { id: 'vinted', label: 'Vinted' },
  { id: 'depop', label: 'Depop' },
  { id: 'leboncoin', label: 'Leboncoin' },
  { id: 'wallapop', label: 'Wallapop' },
  { id: 'kleinanzeigen', label: 'Kleinanzeigen' },
  { id: 'allegro', label: 'Allegro' },
]

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
    <label className="block font-mono text-xs tracking-widest text-muted uppercase mb-1.5">
      {children}
    </label>
  )
}

function fieldClass(extra = '') {
  return `w-full px-3 py-2.5 rounded-lg border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors placeholder:text-muted ${extra}`.trim()
}

// Status badge for queue items
function StatusBadge({ status }: { status: BatchItemState['status'] }) {
  if (status === 'approved') {
    return (
      <span
        className="font-mono text-xs rounded-full px-2 py-0.5 flex items-center gap-1"
        style={{ background: '#DCFCE7', color: '#166534' }}
      >
        <CheckIcon size={10} /> Done
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span
        className="font-mono text-xs rounded-full px-2 py-0.5"
        style={{ background: '#FEE2E2', color: '#991B1B' }}
      >
        Failed
      </span>
    )
  }
  return (
    <span
      className="font-mono text-xs rounded-full px-2 py-0.5"
      style={{ background: '#E8E3DC', color: '#8A7F72' }}
    >
      Ready
    </span>
  )
}

// ─── Batch complete screen ─────────────────────────────────────────────────────

function BatchCompleteScreen({
  items,
  platforms,
  onNewBatch,
}: {
  items: BatchItemState[]
  platforms: string[]
  onNewBatch: () => void
}) {
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const approved = items.filter(it => it.status === 'approved')
  const selectedPlatforms = PLATFORMS.filter(p => platforms.includes(p.id))

  async function copyAllForPlatform(platformId: string, platformLabel: string) {
    const text = approved
      .map(it => `${it.title}\n\n${it.descriptions[platformId] ?? ''}`)
      .join('\n\n---\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(prev => ({ ...prev, [platformId]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [platformId]: false })), 2000)
  }

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <header className="bg-card border-b border-line">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onNewBatch} className="font-mono text-sm text-muted hover:text-ink transition-colors" style={{ minHeight: 44 }}>
            ← New batch
          </button>
          <span className="font-semibold text-ink tracking-tight">ListAI</span>
          <div style={{ width: 80 }} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-8 w-full">
        <div className="text-center flex flex-col gap-2">
          <p className="text-4xl">✓</p>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            {approved.length} listing{approved.length !== 1 ? 's' : ''} ready.
          </h1>
          <p className="text-muted text-sm">Copy per platform below, or copy all {approved.length} for one platform at once.</p>
        </div>

        {/* Per-platform copy all buttons */}
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-muted uppercase">Copy all for platform</h2>
          <div className="flex flex-wrap gap-2">
            {selectedPlatforms.map(p => (
              <button
                key={p.id}
                onClick={() => copyAllForPlatform(p.id, p.label)}
                className="rounded-xl text-sm font-medium border transition-all px-4"
                style={{
                  minHeight: 44,
                  background: copied[p.id] ? '#DCFCE7' : '#FDFBF8',
                  color: copied[p.id] ? '#166534' : '#18140F',
                  borderColor: copied[p.id] ? '#bbf7d0' : '#E8E3DC',
                }}
              >
                {copied[p.id] ? `✓ ${p.label} copied` : `Copy all for ${p.label}`}
              </button>
            ))}
          </div>
        </section>

        {/* Per-item summary */}
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-muted uppercase">Individual items</h2>
          {approved.map((item, i) => (
            <div key={item.id} className="bg-card border border-line rounded-2xl p-4 flex gap-4 items-start">
              <img
                src={item.preview}
                alt={`Item ${i + 1}`}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-line"
              />
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <p className="font-medium text-ink text-sm truncate">{item.title || `Item ${i + 1}`}</p>
                <p className="text-muted text-xs font-mono">€{item.price} · {item.conditionChip}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedPlatforms.map(p => (
                    <CopyItemPlatformButton key={p.id} item={item} platform={p} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>

        <button
          onClick={onNewBatch}
          className="w-full rounded-xl font-semibold text-page bg-ink hover:opacity-90 transition-opacity"
          style={{ minHeight: 56 }}
        >
          📸 New batch
        </button>
      </main>
    </div>
  )
}

function CopyItemPlatformButton({ item, platform }: { item: BatchItemState; platform: { id: string; label: string } }) {
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
      className="rounded-lg text-xs font-mono border transition-all px-2.5"
      style={{
        minHeight: 30,
        background: copied ? '#DCFCE7' : '#FDFBF8',
        color: copied ? '#166534' : '#8A7F72',
        borderColor: copied ? '#bbf7d0' : '#E8E3DC',
      }}
    >
      {copied ? `✓ ${platform.label}` : platform.label}
    </button>
  )
}

// ─── Active item review form ───────────────────────────────────────────────────

function ReviewForm({
  item,
  onChange,
}: {
  item: BatchItemState
  onChange: <K extends keyof BatchItemState>(key: K, value: BatchItemState[K]) => void
}) {
  const [tagInput, setTagInput] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const platforms = parsePlatforms()
  const selectedPlatforms = PLATFORMS.filter(p => platforms.includes(p.id))
  const brandDotColor =
    item.listing?.brand_confidence === 'confirmed' ? '#22c55e'
    : item.listing?.brand_confidence === 'likely' ? '#C4A96B'
    : '#8A7F72'
  const titleOver = item.title.length > 60

  function addTag() {
    const val = tagInput.trim().toLowerCase()
    if (val && !item.tags.includes(val)) onChange('tags', [...item.tags, val])
    setTagInput('')
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
  }

  async function copyPlatform(platformId: string, platformLabel: string) {
    const desc = item.descriptions[platformId] ?? ''
    await navigator.clipboard.writeText(`${item.title}\n\n${desc}`)
    setCopied(prev => ({ ...prev, [platformId]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [platformId]: false })), 2000)
    void platformLabel
  }

  if (item.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: '#FEE2E2' }}
        >
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
    <div className="flex flex-col gap-5">
      {/* Photo */}
      <div className="rounded-2xl overflow-hidden border border-line">
        <img src={item.preview} alt="Item" className="w-full object-cover" style={{ maxHeight: 320 }} />
      </div>

      {/* Photo quality warning */}
      {item.listing && item.listing.photo_quality !== 'good' && (
        <div className="rounded-xl p-4 flex items-start gap-2" style={{ background: '#FFFBEB', color: '#92400E' }}>
          <WarningIcon />
          <p className="text-sm font-medium leading-snug">
            {item.listing.photo_quality === 'needs_retake'
              ? "Photo too unclear — some details couldn't be filled. Check all fields."
              : 'Some details might be off. A clearer photo would help.'}
          </p>
        </div>
      )}

      {/* Low confidence */}
      {item.listing && item.listing.overall_confidence < 0.4 && (
        <div className="flex justify-center">
          <span
            className="font-mono text-xs px-3 py-1 rounded-full border"
            style={{ borderColor: '#C4A96B', color: '#92400E', background: '#FFFBEB' }}
          >
            Low confidence — check all fields
          </span>
        </div>
      )}

      {/* Title + Price */}
      <section className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel>Title</FieldLabel>
            <span className={`font-mono text-xs ${titleOver ? 'text-red-500' : 'text-muted'}`}>
              {item.title.length}/60
            </span>
          </div>
          <input
            type="text"
            value={item.title}
            onChange={e => onChange('title', e.target.value)}
            placeholder="e.g. Nike vintage windbreaker, size M"
            style={{ fontSize: 18 }}
            className={[
              'w-full px-3 py-3 rounded-lg border bg-page text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors placeholder:text-muted',
              titleOver ? 'border-red-400 focus:border-red-400' : 'border-line focus:border-accent',
            ].join(' ')}
          />
        </div>

        <div>
          <FieldLabel>Suggested price</FieldLabel>
          <div className="relative" style={{ width: 140 }}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted select-none pointer-events-none" style={{ fontSize: 18 }}>€</span>
            <input
              type="number"
              step={0.5}
              min={0}
              value={item.price}
              onChange={e => onChange('price', parseFloat(e.target.value) || 0)}
              style={{ fontSize: 18 }}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line bg-page text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Core grid */}
      <section className="bg-card border border-line rounded-2xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: brandDotColor }} />
              <FieldLabel>Brand</FieldLabel>
            </div>
            <input
              type="text"
              value={item.brand}
              onChange={e => onChange('brand', e.target.value)}
              placeholder={item.listing?.brand_confidence === 'unknown' ? "Couldn't detect" : 'Brand name'}
              className={fieldClass()}
            />
          </div>
          <div>
            <FieldLabel>Garment type</FieldLabel>
            <input type="text" value={item.garmentType} onChange={e => onChange('garmentType', e.target.value)} placeholder="e.g. Wrap dress" className={fieldClass()} />
          </div>
          <div>
            <FieldLabel>Colour</FieldLabel>
            <input type="text" value={item.colorPrimary} onChange={e => onChange('colorPrimary', e.target.value)} placeholder="Primary colour" className={fieldClass()} />
          </div>
          <div>
            <FieldLabel>Size</FieldLabel>
            <input type="text" value={item.size} onChange={e => onChange('size', e.target.value)} placeholder="Add size" className={fieldClass()} />
          </div>
        </div>
      </section>

      {/* Condition */}
      <section className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-3">
        <FieldLabel>Condition</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {CONDITION_CHIPS.map(chip => {
            const active = item.conditionChip === chip
            return (
              <button
                key={chip}
                onClick={() => onChange('conditionChip', chip)}
                className="rounded-lg text-sm font-medium border transition-all"
                style={{
                  minHeight: 44,
                  background: active ? '#C4A96B' : '#FDFBF8',
                  color: active ? '#FFFFFF' : '#8A7F72',
                  borderColor: active ? '#C4A96B' : '#E8E3DC',
                }}
              >
                {chip}
              </button>
            )
          })}
        </div>
        {item.listing?.condition_needs_review && (
          <p className="text-xs italic" style={{ color: '#C4A96B' }}>AI wasn&apos;t sure — tap the condition that looks right</p>
        )}
        {item.listing && item.listing.condition_signals.length > 0 && (
          <div>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">AI spotted</p>
            <ul className="flex flex-col gap-1.5">
              {item.listing.condition_signals.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* More details */}
      <section className="bg-card border border-line rounded-2xl overflow-hidden">
        <button
          onClick={() => setMoreOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 text-ink hover:bg-line/20 transition-colors"
          style={{ minHeight: 52 }}
        >
          <span className="font-medium text-sm">More details</span>
          <span className="text-muted"><ChevronIcon open={moreOpen} /></span>
        </button>
        {moreOpen && (
          <div className="px-5 pb-5 border-t border-line pt-4 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Pattern</FieldLabel>
              <select value={item.pattern} onChange={e => onChange('pattern', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-line bg-card text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors appearance-none">
                {PATTERNS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Material</FieldLabel>
              <input type="text" value={item.material} onChange={e => onChange('material', e.target.value)} placeholder="e.g. 100% cotton" className={fieldClass()} />
            </div>
            <div>
              <FieldLabel>Secondary colour</FieldLabel>
              <input type="text" value={item.colorSecondary} onChange={e => onChange('colorSecondary', e.target.value)} placeholder="Optional" className={fieldClass()} />
            </div>
            <div>
              <FieldLabel>Neckline</FieldLabel>
              <input type="text" value={item.neckline} onChange={e => onChange('neckline', e.target.value)} placeholder="e.g. V-neck" className={fieldClass()} />
            </div>
            <div>
              <FieldLabel>Sleeve type</FieldLabel>
              <input type="text" value={item.sleeveType} onChange={e => onChange('sleeveType', e.target.value)} placeholder="e.g. Long sleeve" className={fieldClass()} />
            </div>
          </div>
        )}
      </section>

      {/* Tags */}
      <section className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-ink text-sm">Tags</h2>
        <div className="flex gap-2 pb-1" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {item.tags.map(tag => (
            <button
              key={tag}
              onClick={() => onChange('tags', item.tags.filter(t => t !== tag))}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 rounded-full text-xs font-mono border border-line text-ink hover:border-red-300 hover:text-red-600 transition-colors"
              style={{ minHeight: 36, whiteSpace: 'nowrap' }}
            >
              {tag} <span className="opacity-50">×</span>
            </button>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            onBlur={addTag}
            placeholder="Add tag…"
            className="flex-shrink-0 px-3 rounded-lg border border-line bg-page text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors placeholder:text-muted"
            style={{ minHeight: 36, minWidth: 110 }}
          />
        </div>
      </section>

      {/* Platform descriptions */}
      {selectedPlatforms.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-ink text-sm px-1">Platform descriptions</h2>
          {selectedPlatforms.map(p => (
            <div key={p.id} className="bg-card border border-line rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink text-sm">{p.label}</span>
                <button
                  onClick={() => copyPlatform(p.id, p.label)}
                  className="rounded-lg text-xs font-mono border transition-all px-3"
                  style={{
                    minHeight: 36,
                    background: copied[p.id] ? '#DCFCE7' : '#FDFBF8',
                    color: copied[p.id] ? '#166534' : '#8A7F72',
                    borderColor: copied[p.id] ? '#bbf7d0' : '#E8E3DC',
                  }}
                >
                  {copied[p.id] ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <p className="font-mono text-xs text-muted pb-2 border-b border-line truncate">
                Title: {item.title || <span className="italic">Title preview</span>}
              </p>
              <textarea
                value={item.descriptions[p.id] ?? ''}
                onChange={e => onChange('descriptions', { ...item.descriptions, [p.id]: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-line bg-page text-ink text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors resize-y placeholder:text-muted"
                placeholder={`${p.label} description…`}
              />
            </div>
          ))}
        </section>
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
        onNewBatch={handleNewBatch}
      />
    )
  }

  const activeItem = items[activeIndex]
  const approvedCount = items.filter(it => it.status === 'approved').length
  const readyCount = items.filter(it => it.status === 'ready').length

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header className="bg-card border-b border-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={handleNewBatch}
            className="font-mono text-sm text-muted hover:text-ink transition-colors flex-shrink-0"
            style={{ minHeight: 44 }}
          >
            ← New batch
          </button>
          <div className="font-mono text-xs text-muted flex items-center gap-3">
            <span>{approvedCount} approved</span>
            <span>·</span>
            <span>{readyCount} remaining</span>
          </div>
          <button
            onClick={() => setBatchDone(true)}
            className="font-mono text-sm text-muted hover:text-ink transition-colors flex-shrink-0"
            style={{ minHeight: 44 }}
          >
            Finish →
          </button>
        </div>
      </header>

      {/* Mobile: thumbnail strip */}
      <div className="lg:hidden bg-card border-b border-line px-4 py-3 overflow-x-auto">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(i)}
              className="flex-shrink-0 relative rounded-xl overflow-hidden border-2 transition-all"
              style={{
                width: 56,
                height: 56,
                borderColor: i === activeIndex ? '#C4A96B' : item.status === 'approved' ? '#bbf7d0' : item.status === 'failed' ? '#fca5a5' : '#E8E3DC',
              }}
            >
              <img src={item.preview} alt={`Item ${i + 1}`} className="w-full h-full object-cover" />
              {item.status === 'approved' && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(220,252,231,0.7)' }}>
                  <span style={{ color: '#166534', fontSize: 16 }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: sidebar + content */}
      <div className="max-w-6xl mx-auto flex" style={{ minHeight: 'calc(100vh - 60px)' }}>

        {/* Sidebar — desktop only */}
        <aside
          className="hidden lg:flex flex-col border-r border-line bg-card sticky top-14 overflow-y-auto"
          style={{ width: 280, height: 'calc(100vh - 56px)' }}
        >
          <div className="p-4 flex flex-col gap-2">
            <p className="font-mono text-xs tracking-widest text-muted uppercase mb-1">
              {items.length} photo{items.length !== 1 ? 's' : ''}
            </p>
            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setActiveIndex(i)}
                className="flex items-center gap-3 rounded-xl p-2.5 border-2 text-left transition-all"
                style={{
                  borderColor: i === activeIndex ? '#C4A96B' : 'transparent',
                  background: i === activeIndex ? '#FFFBEB' : 'transparent',
                }}
              >
                <div className="relative flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 48, height: 48 }}>
                  <img src={item.preview} alt={`Item ${i + 1}`} className="w-full h-full object-cover" />
                  {item.status === 'approved' && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(220,252,231,0.75)' }}>
                      <span style={{ color: '#166534', fontSize: 16 }}>✓</span>
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

        {/* Review workspace */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6" style={{ paddingBottom: '8rem' }}>

            {/* Item counter */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted">
                Photo {activeIndex + 1} of {items.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                  disabled={activeIndex === 0}
                  className="px-3 rounded-lg border border-line text-sm text-muted hover:text-ink hover:border-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ minHeight: 36 }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setActiveIndex(i => Math.min(items.length - 1, i + 1))}
                  disabled={activeIndex === items.length - 1}
                  className="px-3 rounded-lg border border-line text-sm text-muted hover:text-ink hover:border-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ minHeight: 36 }}
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Review form for active item */}
            <ReviewForm
              key={activeItem.id}
              item={activeItem}
              onChange={updateField}
            />

          </div>
        </main>
      </div>

      {/* Sticky bottom bar — approve & next */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-line px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex-1 hidden sm:block">
            <p className="font-mono text-xs text-muted">Press <kbd className="px-1.5 py-0.5 rounded border border-line text-xs">Space</kbd> to approve and advance</p>
          </div>
          <button
            onClick={approveAndNext}
            disabled={activeItem.status !== 'ready'}
            className="sm:flex-none flex-1 rounded-xl font-semibold transition-all"
            style={{
              minHeight: 52,
              background: activeItem.status === 'approved' ? '#E8E3DC' : '#C4A96B',
              color: activeItem.status === 'approved' ? '#8A7F72' : '#FFFFFF',
              cursor: activeItem.status !== 'ready' ? 'default' : 'pointer',
              padding: '0 24px',
            }}
          >
            {activeItem.status === 'approved'
              ? '✓ Approved'
              : activeIndex === items.length - 1
              ? 'Approve & finish'
              : 'Approve & next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
