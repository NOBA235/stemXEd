// ============================================================
//  POST /api/webhooks/stripe
//
//  SECURITY CRITICAL:
//  - Uses raw body (must NOT be parsed as JSON by Next.js)
//  - Verifies Stripe signature before touching DB
//  - Uses service role client (bypasses RLS)
//  - Idempotent — safe to process same event twice
//  - Only trusts events pulled via constructEvent, never request body alone
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'
import { sendSubscriptionConfirmEmail, sendCancellationEmail } from '@/lib/email'

export const runtime = 'nodejs'

// MUST disable body parsing so we get raw bytes for signature verification
export const dynamic = 'force-dynamic'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // ── Get raw body bytes (required for signature check) ─────────────────────
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // ── Verify signature — this is the critical security step ─────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    // Signature mismatch = someone is forging webhook calls
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Use service role to bypass RLS for DB writes
  const supabase = createServiceClient()

  // ── Handle events ─────────────────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── Subscription created or renewed ───────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        const plan   = sub.metadata?.plan as string

        if (!userId || !plan) {
          console.error('[webhook] Missing metadata on subscription:', sub.id)
          break
        }

        // Upsert subscription record
        await supabase.from('subscriptions').upsert({
          id:                   sub.id,
          user_id:              userId,
          stripe_customer_id:   sub.customer as string,
          status:               sub.status,
          plan,
          billing_interval:     sub.items.data[0].price.recurring?.interval || 'month',
          stripe_price_id:      sub.items.data[0].price.id,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          trial_end:            sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          updated_at:           new Date().toISOString(),
        }, { onConflict: 'id' })

        // Update profile plan
        const activePlan = sub.status === 'active' || sub.status === 'trialing' ? plan : 'free'
        await supabase
          .from('profiles')
          .update({ plan: activePlan, updated_at: new Date().toISOString() })
          .eq('id', userId)

        console.log(`[webhook] Subscription ${event.type} — user ${userId} → ${activePlan}`)
        break
      }

      // ── Subscription cancelled / ended ────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id

        if (!userId) break

        await supabase.from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('id', sub.id)

        await supabase.from('profiles')
          .update({ plan: 'free', updated_at: new Date().toISOString() })
          .eq('id', userId)

        console.log(`[webhook] Subscription deleted — user ${userId} downgraded to free`)
        break
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription as string | null

        if (subId) {
          await supabase.from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('id', subId)
        }

        // TODO: send dunning email via Resend
        console.warn(`[webhook] Payment failed — subscription ${subId}`)
        break
      }

      // ── Payment succeeded ─────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription as string | null

        if (subId) {
          await supabase.from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', subId)
        }
        break
      }

      default:
        // Log unhandled events for monitoring but don't error
        console.log(`[webhook] Unhandled event: ${event.type}`)
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err)
    // Return 500 so Stripe retries the webhook
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  // Always return 200 after signature verified — even for ignored events
  return NextResponse.json({ received: true })
}
