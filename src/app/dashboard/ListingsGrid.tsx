'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Listing {
  id: string
  title: string | null
  image_url: string | null
  status: string
  platforms: string[]
  created_at: string
}

interface Props {
  listings: Listing[]
  plan: string
  soldSection?: boolean
}

const FREE_VISIBLE = 5

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  ebay:          { label: 'eBay',          color: '#E53238' },
  vinted:        { label: 'Vinted',        color: '#007782' },
  depop:         { label: 'Depop',         color: '#FF4040' },
  poshmark:      { label: 'Poshmark',      color: '#C4375E' },
  mercari:       { label: 'Mercari',       color: '#FF0211' },
  leboncoin:     { label: 'Leboncoin',     color: '#F56B2A' },
  wallapop:      { label: 'Wallapop',      color: '#13C1AC' },
  kleinanzeigen: { label: 'Kleinanzeigen', color: '#C4161C' },
  allegro:       { label: 'Allegro',       color: '#FF5A00' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ListingsGrid({ listings, plan, soldSection = false }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<Listing[]>(listings)
  const [acting, setActing] = useState<string | null>(null)

  const isFree = plan === 'FREE'

  async function markSold(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setActing(id)
    const supabase = createClient()
    const current = items.find(i => i.id === id)
    const next = current?.status === 'sold' ? 'draft' : 'sold'
    await supabase.from('listings').update({ status: next }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
    setActing(null)
  }

  async function deleteListing(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this listing?')) return
    const supabase = createClient()
    await supabase.from('listings').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function openListing(id: string, locked: boolean) {
    if (locked) return
    sessionStorage.removeItem('listai_listing')
    sessionStorage.removeItem('listai_listing_id')
    router.push(`/list/review?id=${id}`)
  }

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => {
        const locked = isFree && !soldSection && idx >= FREE_VISIBLE
        const sold = item.status === 'sold'
        const primaryPlatform = item.platforms[0]
        const platformColor = primaryPlatform ? (PLATFORM_META[primaryPlatform]?.color ?? '#E5E7EB') : '#E5E7EB'

        return (
          <div
            key={item.id}
            onClick={() => openListing(item.id, locked)}
            className="relative bg-card border border-line rounded-2xl overflow-hidden transition-all hover:shadow-sm"
            style={{
              cursor: locked ? 'default' : 'pointer',
              borderLeft: `4px solid ${sold ? '#D1FAE5' : platformColor}`,
            }}
          >
            {/* Locked overlay */}
            {locked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
                style={{ backdropFilter: 'blur(6px)', background: 'rgba(247,244,239,0.75)' }}>
                <button
                  onClick={e => { e.stopPropagation(); router.push('/pricing') }}
                  className="flex items-center gap-1.5 rounded-xl font-semibold text-white text-xs px-4"
                  style={{ minHeight: 36, background: '#00C47A' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Upgrade to unlock
                </button>
              </div>
            )}
            <div className="flex items-center gap-4 p-4" style={{ filter: locked ? 'blur(2px)' : 'none', userSelect: locked ? 'none' : 'auto' }}>
              {/* Thumbnail */}
              <div
                className="flex-shrink-0 rounded-xl overflow-hidden bg-page border border-line"
                style={{ width: 72, height: 72 }}
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.title ?? 'Listing'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm truncate">
                  {item.title ?? 'Untitled listing'}
                </p>
                <p className="text-muted text-xs mt-0.5">{formatDate(item.created_at)}</p>

                {/* Platform chips */}
                {item.platforms.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {item.platforms.slice(0, 4).map(pid => {
                      const meta = PLATFORM_META[pid]
                      if (!meta) return null
                      return (
                        <span
                          key={pid}
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: `${meta.color}18`, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      )
                    })}
                    {item.platforms.length > 4 && (
                      <span className="text-xs text-muted">+{item.platforms.length - 4}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {!soldSection && (
                  <button
                    onClick={e => markSold(item.id, e)}
                    disabled={acting === item.id}
                    className="rounded-lg border text-xs font-medium px-3 transition-all whitespace-nowrap"
                    style={{
                      minHeight: 36,
                      background: sold ? '#D1FAE5' : '#F8F9FA',
                      color: sold ? '#065F46' : '#6B7280',
                      borderColor: sold ? '#A7F3D0' : '#E5E7EB',
                    }}
                  >
                    {acting === item.id ? '…' : sold ? 'Sold ✓' : 'Mark sold'}
                  </button>
                )}
                {soldSection && (
                  <button
                    onClick={e => markSold(item.id, e)}
                    disabled={acting === item.id}
                    className="rounded-lg border text-xs font-medium px-3 transition-all whitespace-nowrap"
                    style={{ minHeight: 36, background: '#F8F9FA', color: '#6B7280', borderColor: '#E5E7EB' }}
                  >
                    {acting === item.id ? '…' : 'Relist'}
                  </button>
                )}
                <button
                  onClick={e => deleteListing(item.id, e)}
                  className="w-9 h-9 rounded-lg border border-line flex items-center justify-center text-muted hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Free plan upgrade prompt */}
      {isFree && !soldSection && items.length > FREE_VISIBLE && (
        <div
          className="rounded-2xl border border-line p-5 flex flex-col items-center gap-3 text-center mt-1"
          style={{ background: '#F0FDF4', borderColor: '#A7F3D0' }}
        >
          <p className="font-semibold text-ink text-sm">
            {items.length - FREE_VISIBLE} older listing{items.length - FREE_VISIBLE > 1 ? 's' : ''} hidden
          </p>
          <p className="text-muted text-sm">Free plan shows your last {FREE_VISIBLE}. Upgrade for full history.</p>
          <button
            onClick={() => router.push('/pricing')}
            className="px-6 rounded-xl font-semibold text-white text-sm"
            style={{ minHeight: 44, background: '#00C47A' }}
          >
            See Pro plans
          </button>
        </div>
      )}
    </div>
  )
}
