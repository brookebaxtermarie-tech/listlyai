import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const COOKIE = 'listai_preview'

// Public paths that bypass the preview gate (API routes need to stay open for Stripe webhook)
const BYPASS = ['/api/stripe/webhook']

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // ── Preview gate ─────────────────────────────────────────────────────────────
  const secret = process.env.PREVIEW_SECRET
  if (secret) {
    const isApiBypass = BYPASS.some(p => pathname.startsWith(p))

    if (!isApiBypass) {
      const cookieVal = request.cookies.get(COOKIE)?.value
      const keyParam  = searchParams.get('key')

      if (cookieVal !== secret && keyParam !== secret) {
        return new NextResponse('Not authorised', { status: 403 })
      }

      // Key supplied via URL param — set cookie and redirect clean URL
      if (keyParam === secret && cookieVal !== secret) {
        const url = request.nextUrl.clone()
        url.searchParams.delete('key')
        const res = NextResponse.redirect(url)
        res.cookies.set(COOKIE, secret, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
        return res
      }
    }
  }

  // ── Supabase session refresh ──────────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
