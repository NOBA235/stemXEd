import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/stripe/plans'
import { timeAgo, SUBJECT_CONFIG } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: recentProblems }, { data: recentExps }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('problems').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('experiments').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
  ])

  const plan = PLANS[profile?.plan || 'free']
  const limit = plan.limits.problemsPerMonth
  const used = profile?.problems_used || 0
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100))

  const QUICK_ACTIONS = [
    { href: '/dashboard/solve', icon: '🔬', label: 'Solve a Problem', desc: 'Upload or type any STEM problem', color: 'violet' },
    { href: '/dashboard/lab', icon: '⚗️', label: 'Virtual Lab', desc: 'Interactive chemistry & physics', color: 'acid', locked: profile?.plan === 'free' },
    { href: '/dashboard/history', icon: '📋', label: 'My Solutions', desc: 'Browse your solved problems', color: 'plasma' },
    { href: '/pricing', icon: '⚡', label: 'Upgrade Plan', desc: 'Unlock unlimited problems', color: 'warn', hide: profile?.plan === 'premium' },
  ].filter(a => !a.hide)

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <div className="text-sm text-white/40 font-mono mb-1">Good to see you back 👋</div>
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
      </div>

      {/* Usage card */}
      <div className="bg-panel border border-white/[0.08] rounded-2xl p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-mono text-white/40 mb-1">CURRENT PLAN</div>
            <div className="text-lg font-bold" style={{ color: plan.id === 'free' ? '#90a4ae' : plan.id === 'basic' ? '#c77dff' : '#39ff8f' }}>
              {plan.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-white/40 mb-1">PROBLEMS THIS MONTH</div>
            <div className="text-lg font-bold">
              {used} <span className="text-white/30 text-sm font-mono">/ {limit === -1 ? '∞' : limit}</span>
            </div>
          </div>
        </div>
        {limit !== -1 && (
          <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct > 80 ? '#ff3b5c' : pct > 60 ? '#ffca3a' : '#c77dff' }} />
          </div>
        )}
        {pct >= 80 && limit !== -1 && (
          <p className="text-xs text-warn font-mono mt-2">
            Running low. <Link href="/pricing" className="underline">Upgrade for more →</Link>
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {QUICK_ACTIONS.map(({ href, icon, label, desc, locked }) => (
          <Link key={href} href={href}
            className={`relative bg-panel border border-white/[0.07] rounded-xl p-4 hover:border-white/15 transition-all group ${locked ? 'opacity-60' : ''}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-sm font-bold mb-0.5 group-hover:text-violet transition-colors">{label}</div>
            <div className="text-xs text-white/40 font-mono">{desc}</div>
            {locked && <div className="absolute top-3 right-3 text-xs bg-warn/20 text-warn font-mono px-1.5 py-0.5 rounded">PRO</div>}
          </Link>
        ))}
      </div>

      {/* Recent problems */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Recent Problems</h2>
            <Link href="/dashboard/history" className="text-xs text-white/40 font-mono hover:text-white/70">View all →</Link>
          </div>
          <div className="space-y-3">
            {!recentProblems?.length && (
              <div className="bg-panel border border-white/[0.07] rounded-xl p-6 text-center">
                <div className="text-2xl mb-2 opacity-30">📭</div>
                <p className="text-sm text-white/40 font-mono">No problems yet</p>
                <Link href="/dashboard/solve" className="inline-block mt-3 text-xs text-violet font-mono hover:underline">Solve your first problem →</Link>
              </div>
            )}
            {recentProblems?.map((p) => {
              const subj = SUBJECT_CONFIG[p.subject as keyof typeof SUBJECT_CONFIG]
              return (
                <div key={p.id} className="bg-panel border border-white/[0.07] rounded-xl p-4 flex items-start gap-3">
                  <span className="text-xl mt-0.5">{subj?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-0.5 truncate">{p.topic || 'Unnamed problem'}</div>
                    <div className="text-xs text-white/40 font-mono flex items-center gap-2">
                      <span style={{ color: subj?.color }}>{p.subject}</span>
                      <span>·</span>
                      <span>{p.difficulty || 'unknown'}</span>
                      <span>·</span>
                      <span>{timeAgo(p.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Lab Experiments</h2>
            <Link href="/dashboard/lab" className="text-xs text-white/40 font-mono hover:text-white/70">Open lab →</Link>
          </div>
          <div className="space-y-3">
            {!recentExps?.length && (
              <div className="bg-panel border border-white/[0.07] rounded-xl p-6 text-center">
                <div className="text-2xl mb-2 opacity-30">⚗️</div>
                <p className="text-sm text-white/40 font-mono">No lab experiments yet</p>
                {profile?.plan === 'free'
                  ? <Link href="/pricing" className="inline-block mt-3 text-xs text-acid font-mono hover:underline">Upgrade to access virtual labs →</Link>
                  : <Link href="/dashboard/lab" className="inline-block mt-3 text-xs text-acid font-mono hover:underline">Start experimenting →</Link>
                }
              </div>
            )}
            {recentExps?.map((e) => (
              <div key={e.id} className="bg-panel border border-white/[0.07] rounded-xl p-4">
                <div className="text-sm font-semibold mb-0.5">{e.inputs?.join(' + ')} → {e.action}</div>
                <div className="text-xs text-white/40 font-mono">{e.subject} · {timeAgo(e.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
