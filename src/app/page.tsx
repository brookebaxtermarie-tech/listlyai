import Link from 'next/link'

const PLATFORMS = ['eBay', 'Vinted', 'Depop', 'Leboncoin', 'Wallapop', 'Kleinanzeigen', 'Allegro']

const FEATURES = [
  {
    title: 'Photo to listing in seconds',
    body: 'Upload a photo. Our AI reads the brand, condition, colour, size, and material — then writes the listing for you.',
  },
  {
    title: 'Every platform, one shot',
    body: 'Get a tailored description for each platform you sell on. Copy and paste — done.',
  },
  {
    title: 'Your history, always there',
    body: 'Every listing you create is saved. Pull up any item, mark it sold, or relist in one tap.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-page" style={{ fontFamily: 'var(--font-sans)' }}>

      {/* Nav */}
      <nav className="border-b border-line bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <span
            className="text-xl font-bold text-ink tracking-tight"
            style={{ fontFamily: 'var(--font-header)' }}
          >
            Listly AI
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted hover:text-ink transition-colors px-3"
              style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl text-sm font-semibold px-5 transition-all hover:opacity-90"
              style={{ minHeight: 40, display: 'flex', alignItems: 'center', background: '#1E2022', color: '#FFFFFF' }}
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center flex flex-col items-center gap-6">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium"
          style={{ background: '#F0FDF4', borderColor: '#00C47A', color: '#009960' }}
        >
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#00C47A' }} />
          Free — 10 listings/month, no card required
        </div>

        <h1
          className="text-4xl sm:text-5xl font-extrabold text-ink leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-header)' }}
        >
          The fastest way to list{' '}
          <span style={{ color: '#00C47A' }}>anything</span>,{' '}
          anywhere.
        </h1>

        <p className="text-lg text-muted max-w-xl leading-relaxed">
          Upload a photo. Listly AI extracts the brand, condition, size, and colour — then writes a ready-to-post listing for every platform you sell on.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/signup"
            className="rounded-xl font-semibold text-base px-8 transition-all hover:opacity-90 shadow-sm"
            style={{ minHeight: 52, display: 'flex', alignItems: 'center', background: '#00E699', color: '#1E2022' }}
          >
            Try it free
          </Link>
          <Link
            href="/login"
            className="rounded-xl font-semibold text-base px-8 border border-line text-ink transition-all hover:border-muted"
            style={{ minHeight: 52, display: 'flex', alignItems: 'center' }}
          >
            Sign in
          </Link>
        </div>

        {/* Platform strip */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {PLATFORMS.map(p => (
            <span
              key={p}
              className="px-3 py-1 rounded-full text-xs font-medium border border-line text-muted bg-card"
            >
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-card rounded-2xl border border-line p-6 flex flex-col gap-3 shadow-sm">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#F0FDF4' }}
              >
                <span className="w-3 h-3 rounded-full block" style={{ background: '#00C47A' }} />
              </div>
              <h3
                className="font-semibold text-ink text-base"
                style={{ fontFamily: 'var(--font-header)' }}
              >
                {f.title}
              </h3>
              <p className="text-muted text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-line bg-card">
        <div className="max-w-xl mx-auto px-4 py-16 text-center flex flex-col items-center gap-5">
          <h2
            className="text-2xl sm:text-3xl font-bold text-ink"
            style={{ fontFamily: 'var(--font-header)' }}
          >
            Get your Sunday back.
          </h2>
          <p className="text-muted">
            Start listing in seconds. No subscription needed to try it.
          </p>
          <Link
            href="/signup"
            className="rounded-xl font-semibold text-base px-10 transition-all hover:opacity-90 shadow-sm"
            style={{ minHeight: 52, display: 'flex', alignItems: 'center', background: '#00E699', color: '#1E2022' }}
          >
            Create free account
          </Link>
        </div>
      </section>
    </div>
  )
}
