'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

// ── Nav icons ──────────────────────────────────────────────────────────────────

function UploadIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C47A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C47A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function PricingIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C47A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const NAV = [
  { href: '/list',      Icon: UploadIcon,  label: 'New listing' },
  { href: '/dashboard', Icon: GridIcon,    label: 'My listings' },
  { href: '/pricing',   Icon: PricingIcon, label: 'Plans'       },
]

const SIDEBAR_BG   = '#1A1C1E'
const SIDEBAR_CARD = '#2A2C2F'
const SIDEBAR_LINE = '#3A3C3F'

interface AppShellProps {
  children: React.ReactNode
  /** Optional slot rendered in the expanded sidebar below nav — pass your queue panel here */
  queueSlot?: React.ReactNode
}

export default function AppShell({ children, queueSlot }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('listai_sidebar')
    if (saved === 'expanded') setExpanded(true)
  }, [])

  function toggleExpanded() {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem('listai_sidebar', next ? 'expanded' : 'collapsed')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarWidth = expanded ? 220 : 56

  return (
    <div className="flex min-h-screen bg-page">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-200 relative"
        style={{ width: sidebarWidth, background: SIDEBAR_BG }}
      >
        {/* Logo row */}
        <div
          className="flex items-center border-b px-3 gap-3 flex-shrink-0"
          style={{ minHeight: 57, borderColor: SIDEBAR_LINE }}
        >
          <button
            onClick={() => router.push('/list')}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ background: '#00C47A', color: '#FFFFFF', fontFamily: 'var(--font-header)' }}
          >
            L
          </button>
          {expanded && (
            <span className="font-bold text-white text-sm truncate flex-1" style={{ fontFamily: 'var(--font-header)' }}>
              Listly AI
            </span>
          )}
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-0.5 p-2">
          {NAV.map(({ href, Icon, label }) => {
            const active = pathname === href || (href === '/list' && pathname.startsWith('/list'))
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                title={!expanded ? label : undefined}
                className="flex items-center gap-3 rounded-lg transition-colors"
                style={{
                  minHeight: 38,
                  padding: expanded ? '0 10px' : '0',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  background: active ? '#2A2C2F' : 'transparent',
                }}
              >
                <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 36, height: 36 }}>
                  <Icon active={active} />
                </span>
                {expanded && (
                  <span className="text-sm font-medium truncate" style={{ color: active ? '#00C47A' : '#9CA3AF' }}>
                    {label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Queue slot — only shown when expanded */}
        {expanded && queueSlot && (
          <div className="flex-1 flex flex-col overflow-hidden border-t mx-2 mt-1" style={{ borderColor: SIDEBAR_LINE }}>
            {queueSlot}
          </div>
        )}

        {/* Spacer when no queue slot */}
        {(!expanded || !queueSlot) && <div className="flex-1" />}

        {/* Sign out */}
        <div className="p-2 border-t" style={{ borderColor: SIDEBAR_LINE }}>
          <button
            onClick={handleSignOut}
            title={!expanded ? 'Sign out' : undefined}
            className="flex items-center gap-3 w-full rounded-lg transition-colors hover:bg-[#2A2C2F]"
            style={{
              minHeight: 38,
              padding: expanded ? '0 10px' : '0',
              justifyContent: expanded ? 'flex-start' : 'center',
            }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 36, height: 36 }}>
              <LogOutIcon />
            </span>
            {expanded && <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Sign out</span>}
          </button>
        </div>

        {/* Edge expand/collapse tab */}
        <button
          onClick={toggleExpanded}
          title={expanded ? 'Collapse' : 'Expand'}
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 flex items-center justify-center rounded-full shadow-md transition-colors"
          style={{ width: 24, height: 24, background: '#00C47A', border: 'none' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          >
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2"
        style={{ height: 60, background: SIDEBAR_BG, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ href, Icon, label }) => {
          const active = pathname === href || (href === '/list' && pathname.startsWith('/list'))
          return (
            <button key={href} onClick={() => router.push(href)} className="flex flex-col items-center gap-1 px-4 py-2">
              <Icon active={active} />
              <span className="text-xs font-medium" style={{ color: active ? '#00C47A' : '#6B7280' }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ── Sidebar queue panel — used by /list ──────────────────────────────────────

interface QueueItem {
  id: string
  preview: string | null
  name: string
  status: 'waiting' | 'processing' | 'done' | 'failed'
}

export interface HistoryItem {
  id: string
  thumb: string | null
  name: string
  completedAt: number
  listingId?: string
}

function QueueThumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#3A3C3F' }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}
    </div>
  )
}

export function SidebarQueue({ items, historyItems = [], onAdd, onHistoryClick }: {
  items: QueueItem[]
  historyItems?: HistoryItem[]
  onAdd?: () => void
  onHistoryClick?: (item: HistoryItem) => void
}) {
  return (
    <div className="flex flex-col h-full py-3 gap-3 overflow-y-auto">
      {/* Active queue */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
          Queue
        </span>
        {onAdd && (
          <button
            onClick={onAdd}
            className="text-xs font-medium rounded-md px-2 py-1 transition-colors hover:bg-[#2A2C2F]"
            style={{ color: '#00C47A' }}
          >
            + Add
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center"
            style={{ background: '#2A2C2F', minHeight: 80 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p className="text-xs leading-snug" style={{ color: '#6B7280' }}>
              Add a photo to process
            </p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-xl p-2"
              style={{ background: '#2A2C2F' }}
            >
              <QueueThumb src={item.preview} alt={item.name} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#E5E7EB' }}>{item.name}</p>
                <p className="text-xs mt-0.5" style={{ color: item.status === 'done' ? '#00C47A' : item.status === 'failed' ? '#EF4444' : '#6B7280' }}>
                  {item.status === 'waiting' ? 'Ready' : item.status === 'processing' ? 'Processing…' : item.status === 'done' ? 'Done ✓' : 'Failed'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* History */}
      {historyItems.length > 0 && (
        <>
          <div className="px-1 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
              History
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {historyItems.map(item => (
              <button
                key={item.id}
                onClick={() => onHistoryClick?.(item)}
                className="flex items-center gap-2 rounded-xl p-2 text-left w-full transition-colors hover:bg-[#353739]"
                style={{ background: '#2A2C2F' }}
              >
                <QueueThumb src={item.thumb} alt={item.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#E5E7EB' }}>{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#00C47A' }}>Completed ✓</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Platform logo component ──────────────────────────────────────────────────

const PLATFORM_LOGOS: Record<string, { logo: string; icon: string; color: string }> = {
  ebay:          { logo: '/platforms/ebay-logo.svg',         icon: '/platforms/ebay-icon.png',          color: '#E53238' },
  vinted:        { logo: '/platforms/vinted-logo.png',       icon: '/platforms/vinted-icon.png',        color: '#007782' },
  depop:         { logo: '/platforms/depop-logo.svg',        icon: '/platforms/depop-icon.jpeg',        color: '#FF4040' },
  poshmark:      { logo: '/platforms/poshmark-logo.png',     icon: '/platforms/poshmark-icon.png',      color: '#C4375E' },
  mercari:       { logo: '/platforms/mercari-logo.png',      icon: '/platforms/mercari-icon.png',       color: '#FF0211' },
  leboncoin:     { logo: '/platforms/leboncoin-logo.png',    icon: '/platforms/leboncoin-icon.png',     color: '#F56B2A' },
  wallapop:      { logo: '/platforms/wallapop-logo.png',     icon: '/platforms/wallapop-icon.webp',     color: '#13C1AC' },
  kleinanzeigen: { logo: '/platforms/kleinanzeigen-logo.webp', icon: '/platforms/kleinanzeigen-icon.webp', color: '#C4161C' },
  allegro:       { logo: '/platforms/allegro-logo.png',      icon: '/platforms/allegro-icon.png',       color: '#FF5A00' },
}

export function PlatformLogo({ id, type = 'icon', size = 24 }: { id: string; type?: 'logo' | 'icon'; size?: number }) {
  const meta = PLATFORM_LOGOS[id]
  if (!meta) {
    return (
      <span
        className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, background: '#6B7280', fontSize: size * 0.4 }}
      >
        {id.charAt(0).toUpperCase()}
      </span>
    )
  }
  return (
    <Image
      src={type === 'logo' ? meta.logo : meta.icon}
      alt={id}
      width={size}
      height={size}
      className="object-contain flex-shrink-0"
      style={{ borderRadius: type === 'icon' ? '6px' : 0 }}
    />
  )
}
