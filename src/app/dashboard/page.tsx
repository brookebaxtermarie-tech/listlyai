import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ListingsGrid from './ListingsGrid'
import DeleteAccountButton from './DeleteAccountButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: listings }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase
      .from('listings')
      .select('id, title, image_url, status, platforms, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const plan = profile?.plan ?? 'FREE'

  // Generate signed URLs for private bucket images (1 hour expiry)
  const all = await Promise.all(
    (listings ?? []).map(async (l) => {
      if (!l.image_url || l.image_url.startsWith('http')) return l
      const { data: signed } = await supabase.storage
        .from('listing-images')
        .createSignedUrl(l.image_url, 3600)
      return { ...l, image_url: signed?.signedUrl ?? null }
    })
  )

  const sold = all.filter(l => l.status === 'sold')
  const active = all.filter(l => l.status !== 'sold')

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen bg-page pb-16 md:pb-0">

        {/* Header */}
        <header className="bg-card border-b border-line sticky top-0 z-20">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            <div>
              <h1
                className="font-bold text-ink text-lg"
                style={{ fontFamily: 'var(--font-header)' }}
              >
                My listings
              </h1>
              <p className="text-muted text-xs mt-0.5">
                {active.length} active · {sold.length} sold
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{
                  background: plan === 'FREE' ? '#F8F9FA' : '#F0FDF4',
                  borderColor: plan === 'FREE' ? '#E5E7EB' : '#00C47A',
                  color: plan === 'FREE' ? '#6B7280' : '#009960',
                }}
              >
                {plan}
              </span>
              <Link
                href="/list"
                className="rounded-xl font-semibold text-sm px-4 flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ minHeight: 40, background: '#00C47A', color: '#FFFFFF' }}
              >
                + New listing
              </Link>
            </div>
          </div>
        </header>

        <div className="px-4 md:px-8 py-6 flex flex-col gap-8 max-w-5xl w-full mx-auto">

          {/* Active listings */}
          {active.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">
                Active — {active.length}
              </h2>
              <ListingsGrid listings={active} plan={plan} />
            </section>
          )}

          {/* Sold listings */}
          {sold.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">
                Sold — {sold.length}
              </h2>
              <ListingsGrid listings={sold} plan={plan} soldSection />
            </section>
          )}

          {/* Empty state */}
          {all.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center"
                style={{ borderColor: '#E5E7EB' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-ink">No listings yet</p>
                <p className="text-muted text-sm mt-1">Upload your first photo to get started</p>
              </div>
              <Link
                href="/list"
                className="mt-2 px-6 rounded-xl font-semibold text-white"
                style={{ minHeight: 48, display: 'flex', alignItems: 'center', background: '#00C47A' }}
              >
                Upload a photo
              </Link>
            </div>
          )}

          {/* Account section */}
          <section className="flex flex-col gap-3 pt-4 border-t border-line">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">Account</h2>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted">
                Questions or data requests:{' '}
                <a href="mailto:listlyai.contact@gmail.com" className="text-ink underline underline-offset-2">
                  listlyai.contact@gmail.com
                </a>
              </p>
              <div className="flex gap-4 text-xs text-muted mt-1">
                <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
              </div>
            </div>
            <DeleteAccountButton />
          </section>

        </div>
      </div>
    </AppShell>
  )
}
