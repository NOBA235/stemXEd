'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PLAN_LIST } from '@/lib/stripe/plans'

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="min-h-screen bg-void text-white font-display py-24 px-6">
      <div className="absolute inset-0 bg-grid-dim bg-grid opacity-100 pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Back nav */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 font-mono hover:text-white/70 transition-colors mb-12">
          ← Back to home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">Simple, honest pricing</h1>
          <p className="text-white/50 font-mono text-base mb-8">Start free. Upgrade when you need more.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-2 bg-panel border border-white/[0.08] rounded-xl p-1">
            {(['monthly', 'yearly'] as const).map((b) => (
              <button key={b} onClick={() => setBilling(b)}
                className={`px-6 py-2 rounded-lg font-mono text-sm font-semibold transition-all ${
                  billing === b ? 'bg-violet text-white' : 'text-white/40 hover:text-white/70'
                }`}>
                {b === 'yearly' ? '🎉 Yearly (save ~30%)' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_LIST.map((plan, i) => {
            const price = plan.price[billing]
            const isHighlight = plan.highlight
            return (
              <motion.div key={plan.id}
                className={`relative bg-panel rounded-2xl border p-6 flex flex-col ${
                  isHighlight
                    ? 'border-violet shadow-[0_0_60px_rgba(199,125,255,0.15)]'
                    : 'border-white/[0.08]'
                }`}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}>

                {isHighlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet text-white text-xs font-bold font-mono px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-base font-bold text-white/70 mb-1">{plan.name}</div>
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className="text-4xl font-extrabold">
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-white/40 font-mono text-sm mb-1">
                        /{billing === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                  </div>
                  {billing === 'yearly' && price > 0 && (
                    <div className="text-xs text-acid font-mono">
                      ${Math.round(price / 12)}/mo billed yearly
                    </div>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="text-acid mt-0.5 text-xs">✓</span>
                      <span className="text-white/60 font-mono text-xs leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.id === 'free' ? '/auth/register' : `/auth/register?plan=${plan.id}&billing=${billing}`}
                  className={`w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
                    isHighlight
                      ? 'bg-violet text-white hover:bg-violet/90 hover:shadow-[0_0_30px_rgba(199,125,255,0.4)]'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                  }`}>
                  {plan.id === 'free' ? 'Get started free' : `Start ${plan.name}`}
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {[
              { q: 'What counts as a "problem"?', a: 'Each time you submit a problem for solving counts as one use. Viewing past solutions is free and unlimited.' },
              { q: 'Can I cancel anytime?', a: 'Yes, cancel anytime from your account settings. You keep access until the end of your billing period.' },
              { q: 'What subjects are supported?', a: 'Mathematics, Physics, Chemistry, and Biology — from GCSE/high school level up to undergraduate.' },
              { q: 'How accurate are the solutions?', a: "Claude AI is highly accurate but can make mistakes. Always verify important answers. We're continuously improving." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-panel border border-white/[0.07] rounded-xl p-5">
                <div className="font-semibold text-sm mb-2">{q}</div>
                <div className="text-sm text-white/50 font-mono leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
