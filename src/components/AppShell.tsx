'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

// ── Nav icons ──────────────────────────────────────────────────────────────────

function UploadIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C47A' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C47A' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function PricingIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C47A' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="13 17 18 12 13 7" />
      <polyline points="6 17 11 12 6 7" />
    </svg>
  )
}

const NAV = [
  { href: '/list',      Icon: UploadIcon,  label: 'New listing' },
  { href: '/dashboard', Icon: GridIcon,    label: 'My listings' },
  { href: '/pricing',   Icon: PricingIcon, label: 'Plans'       },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  // Persist sidebar state
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

  const sidebarWidth = expanded ? 200 : 64

  return (
    <div className="flex min-h-screen bg-page">

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col border-r border-line bg-card flex-shrink-0 transition-all duration-200"
        style={{ width: sidebarWidth }}
      >
        {/* Logo + expand toggle */}
        <div className="flex items-center px-3 py-4 border-b border-line gap-3" style={{ minHeight: 57 }}>
          <button
            onClick={() => router.push('/list')}
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: '#00C47A', color: '#FFFFFF', fontFamily: 'var(--font-header)' }}
          >
            L
          </button>
          {expanded && (
            <span className="font-bold text-ink text-sm truncate flex-1" style={{ fontFamily: 'var(--font-header)' }}>
              Listly AI
            </span>
          )}
          <button
            onClick={toggleExpanded}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-page transition-colors flex-shrink-0"
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ExpandIcon expanded={expanded} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 p-2 flex-1">
          {NAV.map(({ href, Icon, label }) => {
            const active = pathname === href || (href === '/list' && pathname.startsWith('/list'))
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                title={!expanded ? label : undefined}
                className="flex items-center gap-3 rounded-xl transition-colors"
                style={{
                  minHeight: 40,
                  padding: expanded ? '0 12px' : '0',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  background: active ? '#F0FDF4' : 'transparent',
                }}
              >
                <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
                  <Icon active={active} />
                </span>
                {expanded && (
                  <span className="text-sm font-medium truncate" style={{ color: active ? '#00C47A' : '#6B7280' }}>
                    {label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Sign out */}
        <div className="p-2 border-t border-line">
          <button
            onClick={handleSignOut}
            title={!expanded ? 'Sign out' : undefined}
            className="flex items-center gap-3 w-full rounded-xl hover:bg-page transition-colors"
            style={{
              minHeight: 40,
              padding: expanded ? '0 12px' : '0',
              justifyContent: expanded ? 'flex-start' : 'center',
            }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
              <LogOutIcon />
            </span>
            {expanded && (
              <span className="text-sm font-medium text-muted">Sign out</span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* ── Mobile bottom tab bar ──────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-line flex items-center justify-around px-2"
        style={{ height: 60, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ href, Icon, label }) => {
          const active = pathname === href || (href === '/list' && pathname.startsWith('/list'))
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex flex-col items-center gap-1 px-4 py-2"
            >
              <Icon active={active} />
              <span className="text-xs font-medium" style={{ color: active ? '#00C47A' : '#9CA3AF' }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ── Platform logo component — exported for use in upload + review ──────────────

const PLATFORM_LOGOS: Record<string, { logo: string; icon: string; color: string }> = {
  ebay:          { logo: '/platforms/ebay-logo.svg',          icon: '/platforms/ebay-icon.png',          color: '#E53238' },
  vinted:        { logo: '/platforms/vinted-logo.png',        icon: '/platforms/vinted-icon.png',        color: '#007782' },
  depop:         { logo: '/platforms/depop-logo.svg',         icon: '/platforms/depop-icon.jpeg',         color: '#FF4040' },
  poshmark:      { logo: '/platforms/poshmark-logo.png',      icon: '/platforms/poshmark-icon.png',      color: '#C4375E' },
  mercari:       { logo: '/platforms/mercari-logo.png',       icon: '/platforms/mercari-icon.png',       color: '#FF0211' },
  leboncoin:     { logo: '/platforms/leboncoin-logo.png',     icon: '/platforms/leboncoin-icon.png',     color: '#F56B2A' },
  wallapop:      { logo: '/platforms/wallapop-logo.png',      icon: '/platforms/wallapop-icon.png',      color: '#13C1AC' },
  kleinanzeigen: { logo: '/platforms/kleinanzeigen-logo.webp',icon: '/platforms/kleinanzeigen-icon.webp',color: '#C4161C' },
  allegro:       { logo: '/platforms/allegro-logo.png',       icon: '/platforms/allegro-icon.png',       color: '#FF5A00' },
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
  const src = type === 'logo' ? meta.logo : meta.icon
  return (
    <Image
      src={src}
      alt={id}
      width={size}
      height={size}
      className="object-contain flex-shrink-0"
      style={{ borderRadius: type === 'icon' ? '6px' : 0 }}
      onError={(e) => {
        // Fallback to colored initial if image fails
        const target = e.currentTarget as HTMLImageElement
        target.style.display = 'none'
      }}
    />
  )
}
