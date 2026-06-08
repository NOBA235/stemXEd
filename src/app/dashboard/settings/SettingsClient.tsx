'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { PLANS, PLAN_LIST } from '@/lib/stripe/plans'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Subscription } from '@/types'

export default function SettingsClient() {
  const params = useSearchParams()
  const [profile, setProfile]        = useState<Profile | null>(null)
  const [sub, setSub]                = useState<Subscription | null>(null)
  const [billing, setBilling]        = useState<'monthly' | 'yearly'>('monthly')
  const [loadingPortal, setPortal]   = useState(false)
  const [loadingUpgrade, setUpgrade] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('checkout') === 'success') toast.success('🎉 Subscription activated!')
  }, [params])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      ]).then(([{ data: p }, { data: s }]) => { setProfile(p); setSub(s) })
    })
  }, [])

  const handleUpgrade = async (planId: string) => {
    setUpgrade(planId)
    try {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, billing }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      if (data.url) window.location.href = data.url
    } catch { toast.error('Failed to start checkout') }
    finally { setUpgrade(null) }
  }

  const handlePortal = async () => {
    setPortal(true)
    try {
      const res = await fetch('/api/subscriptions/portal', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) { toast.error(error); return }
      window.location.href = url
    } catch { toast.error('Failed to open billing portal') }
    finally { setPortal(false) }
  }

  const currentPlan = PLANS[profile?.plan || 'free']
  const planColor = profile?.plan === 'free' ? '#90a4ae' : profile?.plan === 'basic' ? '#c77dff' : '#39ff8f'

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-white/40 font-mono mb-8">Manage your account and subscription</p>

      {/* Current plan */}
      <section className="bg-panel border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-[11px] font-bold text-white/40 mb-4 font-mono tracking-widest">CURRENT PLAN</h2>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-2xl font-extrabold mb-0.5" style={{ color: planColor }}>
              {currentPlan.name}
            </div>
            <div className="text-sm text-white/50 font-mono">
              {currentPlan.price.monthly === 0
                ? 'Free forever'
                : `$${currentPlan.price.monthly}/mo · $${currentPlan.price.yearly}/yr`}
            </div>
            {sub?.current_period_end && (
              <div className="text-xs text-white/30 font-mono mt-1">
                {sub.cancel_at_period_end ? 'Cancels' : 'Renews'}: {new Date(sub.current_period_end).toLocaleDateString()}
              </div>
            )}
          </div>
          {profile?.plan !== 'free' && (
            <button onClick={handlePortal} disabled={loadingPortal}
              className="bg-surface border border-white/10 text-white/70 font-mono text-xs px-5 py-2.5 rounded-xl hover:border-white/20 transition-all disabled:opacity-50">
              {loadingPortal ? 'Opening...' : 'Manage billing →'}
            </button>
          )}
        </div>
      </section>

      {/* Usage */}
      <section className="bg-panel border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-[11px] font-bold text-white/40 mb-4 font-mono tracking-widest">USAGE THIS MONTH</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Problems Solved', val: profile?.problems_used ?? 0, limit: currentPlan.limits.problemsPerMonth },
            { label: 'Lab Experiments', val: profile?.experiments_run ?? 0, limit: -1 },
          ].map(({ label, val, limit }) => (
            <div key={label} className="bg-surface rounded-xl p-4">
              <div className="text-xs font-mono text-white/40 mb-1">{label}</div>
              <div className="text-xl font-bold mb-2">
                {val} <span className="text-sm text-white/30 font-mono">/ {limit === -1 ? '∞' : limit}</span>
              </div>
              {limit > 0 && (
                <div className="w-full bg-raised rounded-full h-1 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (val / limit) * 100)}%`, background: planColor }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Upgrade */}
      {profile?.plan !== 'premium' && (
        <section className="bg-panel border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] font-bold text-white/40 font-mono tracking-widest">UPGRADE PLAN</h2>
            <div className="flex gap-1 bg-surface border border-white/[0.08] rounded-lg p-0.5">
              {(['monthly', 'yearly'] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  className={`px-4 py-1.5 rounded-md font-mono text-xs transition-all ${billing === b ? 'bg-violet text-white' : 'text-white/40'}`}>
                  {b === 'yearly' ? 'Yearly −30%' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {PLAN_LIST.filter(p => p.id !== 'free' && p.id !== profile?.plan).map(plan => (
              <motion.div key={plan.id}
                className={`border rounded-xl p-5 ${plan.highlight ? 'border-violet/40 bg-violet/5' : 'border-white/[0.07]'}`}
                whileHover={{ scale: 1.01 }}>
                <div className="text-base font-bold mb-0.5">{plan.name}</div>
                <div className="text-2xl font-extrabold mb-3">
                  ${plan.price[billing]}
                  <span className="text-sm text-white/30 font-mono">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map(f => (
                    <li key={f} className="text-xs text-white/50 font-mono flex gap-2">
                      <span className="text-acid">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleUpgrade(plan.id)} disabled={loadingUpgrade === plan.id}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                    plan.highlight ? 'bg-violet text-white hover:bg-violet/90' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                  }`}>
                  {loadingUpgrade === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name} →`}
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
