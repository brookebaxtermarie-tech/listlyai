'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PLATFORM_COLORS: Record<string, string> = {
  ebay:          '#5B8DB8',
  vinted:        '#4A9E8E',
  depop:         '#C47A7A',
  leboncoin:     '#C49A5B',
  kleinanzeigen: '#8EA85B',
  wallapop:      '#5B9EA8',
  allegro:       '#C4725B',
}

export { PLATFORM_COLORS }

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

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C47A' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

const NAV = [
  { href: '/list',      Icon: UploadIcon,   label: 'Upload'   },
  { href: '/dashboard', Icon: GridIcon,     label: 'Listings' },
  { href: '/pricing',   Icon: SettingsIcon, label: 'Plans'    },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-page">

      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col items-center py-5 gap-2 border-r border-line bg-card flex-shrink-0"
        style={{ width: 64 }}
      >
        {/* Logo mark */}
        <button
          onClick={() => router.push('/list')}
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 font-bold text-sm"
          style={{ background: '#00C47A', color: '#FFFFFF', fontFamily: 'var(--font-header)' }}
        >
          L
        </button>

        {/* Nav icons */}
        <div className="flex flex-col items-center gap-1 flex-1">
          {NAV.map(({ href, Icon, label }) => {
            const active = pathname === href || (href === '/list' && pathname.startsWith('/list'))
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                title={label}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: active ? '#F0FDF4' : 'transparent' }}
              >
                <Icon active={active} />
              </button>
            )
          })}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-page transition-colors"
        >
          <LogOutIcon />
        </button>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* ── Mobile bottom tab bar ────────────────────────────────────── */}
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
              <span
                className="text-xs font-medium"
                style={{ color: active ? '#00C47A' : '#9CA3AF' }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
