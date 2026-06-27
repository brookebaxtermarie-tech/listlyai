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

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C47A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const NAV = [
  { href: '/list',      Icon: UploadIcon,   label: 'New listing' },
  { href: '/dashboard', Icon: GridIcon,     label: 'My listings' },
  { href: '/settings',  Icon: SettingsIcon, label: 'Settings'    },
]

/* Light premium shell — see design book in globals.css */
const SIDEBAR_BG     = '#FFFFFF'
const SIDEBAR_HOVER  = '#F4F5F7'
const SIDEBAR_ACTIVE = '#F0FDF4'
const SIDEBAR_LINE   = '#E5E7EB'

interface AppShellProps {
  children: React.ReactNode
  /** Optional slot rendered in the expanded sidebar below nav — pass your queue panel here */
  queueSlot?: React.ReactNode
}

function isActive(pathname: string, href: string) {
  if (href === '/list') return pathname.startsWith('/list')
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AppShell({ children, queueSlot }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('listai_sidebar')
    if (saved === 'expanded') setExpanded(true)
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? null)
      // Onboarding guard — send new users through setup before using the app
      const { data: profile } = await supabase.from('profiles').select('onboarded_at').eq('id', user.id).single()
      if (profile && !profile.onboarded_at) router.replace('/onboarding')
    })
  }, [router])

  function toggleExpanded() {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem('listai_sidebar', next ? 'expanded' : 'collapsed')
  }

  const sidebarWidth = expanded ? 220 : 56
  const initial = email ? email.charAt(0).toUpperCase() : ''
  const accountActive = isActive(pathname, '/settings')

  return (
    <div className="flex min-h-screen bg-page">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-200 relative"
        style={{ width: sidebarWidth, background: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_LINE}` }}
      >
        {/* Logo row */}
        <div
          className="border-b flex-shrink-0 flex items-center"
          style={{ minHeight: 57, borderColor: SIDEBAR_LINE, paddingLeft: expanded ? 14 : 0, paddingRight: expanded ? 14 : 0, justifyContent: expanded ? 'flex-start' : 'center' }}
        >
          <button
            onClick={() => router.push('/list')}
            className="flex items-center flex-shrink-0"
            title="Listly AI"
            style={{ width: expanded ? '100%' : 'auto' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expanded ? '/listly_wordmark_nobg.svg' : '/listly_negative_nobg.svg'}
              alt="Listly AI"
              style={expanded
                ? { width: '100%', height: 'auto', maxHeight: 48 }
                : { height: 30, width: 'auto' }}
            />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 p-2">
          {NAV.filter(n => n.href !== '/settings').map(({ href, Icon, label }) => {
            const active = isActive(pathname, href)
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
                  background: active ? SIDEBAR_ACTIVE : 'transparent',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = SIDEBAR_HOVER }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 36, height: 36 }}>
                  <Icon active={active} />
                </span>
                {expanded && (
                  <span className="text-sm font-medium truncate" style={{ color: active ? 'var(--color-accent-dark)' : 'var(--color-ink-2)' }}>
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

        {/* Bottom group — Settings + account chip */}
        <div className="p-2 border-t flex flex-col gap-1" style={{ borderColor: SIDEBAR_LINE }}>
          {/* Settings */}
          <button
            onClick={() => router.push('/settings')}
            title={!expanded ? 'Settings' : undefined}
            className="flex items-center gap-3 rounded-lg transition-colors"
            style={{
              minHeight: 38,
              padding: expanded ? '0 10px' : '0',
              justifyContent: expanded ? 'flex-start' : 'center',
              background: accountActive ? SIDEBAR_ACTIVE : 'transparent',
            }}
            onMouseEnter={e => { if (!accountActive) e.currentTarget.style.background = SIDEBAR_HOVER }}
            onMouseLeave={e => { if (!accountActive) e.currentTarget.style.background = 'transparent' }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 36, height: 36 }}>
              <SettingsIcon active={accountActive} />
            </span>
            {expanded && (
              <span className="text-sm font-medium truncate" style={{ color: accountActive ? 'var(--color-accent-dark)' : 'var(--color-ink-2)' }}>
                Settings
              </span>
            )}
          </button>

          {/* Account chip — also opens settings */}
          <button
            onClick={() => router.push('/settings')}
            title={!expanded ? (email ?? 'Account') : undefined}
            className="flex items-center gap-3 w-full rounded-lg transition-colors"
            style={{
              minHeight: 44,
              padding: expanded ? '6px 8px' : '0',
              justifyContent: expanded ? 'flex-start' : 'center',
              background: 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = SIDEBAR_HOVER }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <span
              className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-semibold"
              style={{ width: 30, height: 30, background: 'var(--color-accent-tint)', color: 'var(--color-accent-dark)' }}
            >
              {initial}
            </span>
            {expanded && (
              <span className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-xs font-semibold text-ink truncate w-full text-left">Account</span>
                <span className="text-[11px] text-muted truncate w-full text-left">{email ?? '—'}</span>
              </span>
            )}
          </button>
        </div>

        {/* Edge expand/collapse tab */}
        <button
          onClick={toggleExpanded}
          title={expanded ? 'Collapse' : 'Expand'}
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 flex items-center justify-center rounded-full transition-colors"
          style={{ width: 24, height: 24, background: '#00C47A', border: '2px solid #FFFFFF', boxShadow: 'var(--shadow-sm)' }}
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 border-t"
        style={{ height: 60, background: SIDEBAR_BG, borderColor: SIDEBAR_LINE, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ href, Icon, label }) => {
          const active = isActive(pathname, href)
          return (
            <button key={href} onClick={() => router.push(href)} className="flex flex-col items-center gap-1 px-4 py-2">
              <Icon active={active} />
              <span className="text-xs font-medium" style={{ color: active ? 'var(--color-accent-dark)' : 'var(--color-muted)' }}>{label}</span>
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
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--color-fill)' }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        <span className="t-label">Queue</span>
        {onAdd && (
          <button
            onClick={onAdd}
            className="text-xs font-semibold rounded-md px-2 py-1 transition-colors hover:bg-[var(--color-sidebar-hover)]"
            style={{ color: 'var(--color-accent-dark)' }}
          >
            + Add
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center"
            style={{ background: 'var(--color-fill)', minHeight: 80 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-muted)' }}>
              Add a photo to process
            </p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-xl p-2 border"
              style={{ background: 'var(--color-fill)', borderColor: 'var(--color-line)' }}
            >
              <QueueThumb src={item.preview} alt={item.name} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-ink">{item.name}</p>
                <p className="text-xs mt-0.5" style={{ color: item.status === 'done' ? 'var(--color-accent-dark)' : item.status === 'failed' ? 'var(--color-danger)' : item.status === 'processing' ? 'var(--color-accent-dark)' : 'var(--color-muted)' }}>
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
            <span className="t-label">History</span>
          </div>
          <div className="flex flex-col gap-2">
            {historyItems.map(item => (
              <button
                key={item.id}
                onClick={() => onHistoryClick?.(item)}
                className="flex items-center gap-2 rounded-xl p-2 text-left w-full transition-colors border hover:bg-[var(--color-sidebar-hover)]"
                style={{ background: 'var(--color-card)', borderColor: 'var(--color-line)' }}
              >
                <QueueThumb src={item.thumb} alt={item.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-ink">{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-accent-dark)' }}>Completed ✓</p>
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
  if (type === 'logo') {
    // Logos are wide wordmarks — fix the height and let width breathe
    return (
      <Image
        src={meta.logo}
        alt={id}
        width={size * 4}
        height={size}
        className="object-contain object-left flex-shrink-0"
        style={{ maxHeight: size, width: 'auto' }}
      />
    )
  }
  return (
    <Image
      src={meta.icon}
      alt={id}
      width={size}
      height={size}
      className="object-contain flex-shrink-0"
      style={{ borderRadius: '6px' }}
    />
  )
}
