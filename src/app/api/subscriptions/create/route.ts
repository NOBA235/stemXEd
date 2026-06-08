// ============================================================
//  POST /api/subscriptions/create
//  Creates a Stripe Checkout Session (hosted page)
//  Security:
//   - Auth required
//   - Plan/billing validated server-side
//   - Idempotency key prevents duplicate charges
//   - Stripe customer ID stored per user (no duplicates)
//   - success_url uses session_id for verification
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { PLANS } from '@/lib/stripe/plans'
import { createClient } from '@/lib/supabase/server'
import { validateSubscriptionPayload, ValidationError } from '@/lib/validate'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Rate limit checkout creation (prevent abuse) ──────────────────────────
  const rl = rateLimit(`checkout:${user.id}`, { limit: 5, windowSec: 300 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many checkout attempts. Wait a few minutes.' }, { status: 429 })
  }

  // ── Validate payload ──────────────────────────────────────────────────────
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  let payload
  try { payload = validateSubscriptionPayload(body) }
  catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const plan = PLANS[payload.plan]
  if (!plan || !plan.stripePriceId[payload.billing]) {
    return NextResponse.json({ error: 'Invalid plan configuration' }, { status: 400 })
  }

  const priceId = plan.stripePriceId[payload.billing]

  // ── Get or create Stripe customer ─────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, username, plan')
    .eq('id', user.id)
    .single()

  // Prevent downgrade/same-plan checkout
  if (profile?.plan === payload.plan) {
    return NextResponse.json({ error: 'You are already on this plan' }, { status: 400 })
  }

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: profile?.username || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // ── Create checkout session ───────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/pricing?checkout=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: payload.plan,
          billing: payload.billing,
        },
        // 7-day free trial for new Basic/Premium subscribers
        trial_period_days: profile?.plan === 'free' ? 7 : undefined,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: { address: 'auto' },
      metadata: {
        supabase_user_id: user.id,
        plan: payload.plan,
      },
    },
    // Idempotency key — prevents duplicate checkout sessions if user double-clicks
    {
      idempotencyKey: `checkout-${user.id}-${payload.plan}-${payload.billing}-${Date.now()}`,
    }
  )

  return NextResponse.json({ url: session.url })
}
