import Stripe from 'stripe'

// Lazy singleton — instantiated on first request, not at build time.
// This prevents "STRIPE_SECRET_KEY not set" errors during `next build`.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    _stripe = new Stripe(key, { apiVersion: '2024-06-20', typescript: true })
  }
  return _stripe
}

// Convenience export — same interface as before, just lazy
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
