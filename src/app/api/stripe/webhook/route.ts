import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const PLAN_MAP: Record<string, string> = {
    [process.env.STRIPE_PRICE_PRO!]:   'PRO',
    [process.env.STRIPE_PRICE_POWER!]: 'POWER',
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id ?? session.metadata?.user_id

    let plan = 'PRO'
    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const pid = sub.items.data[0]?.price.id
      plan = PLAN_MAP[pid] ?? 'PRO'
    }

    if (userId) {
      const supabase = await createClient()
      await supabase.from('profiles').update({ plan }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    if (userId) {
      const supabase = await createClient()
      await supabase.from('profiles').update({ plan: 'FREE' }).eq('id', userId)
    }
  }

  return NextResponse.json({ received: true })
}
