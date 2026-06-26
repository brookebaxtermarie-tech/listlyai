import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json() as { plan: string }

  const PRICE_IDS: Record<string, string> = {
    pro: process.env.STRIPE_PRICE_PRO!,
  }
  const priceId = PRICE_IDS[plan]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const ALLOWED_ORIGINS = new Set([
    'https://listlyai-photo.vercel.app',
    'http://localhost:3000',
  ])
  const requestOrigin = req.headers.get('origin') ?? ''
  const origin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : 'https://listlyai-photo.vercel.app'
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    success_url: `${origin}/list?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { user_id: user.id, plan },
  })

  return NextResponse.json({ url: session.url })
}
