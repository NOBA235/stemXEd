'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { PLANS } from '@/lib/stripe/plans'

const NAV: { href: string; icon: string; label: string; adminOnly?: boolean }[] = [
  { href: '/dashboard',       icon: '🏠', label: 'Home'       },
  { href: '/dashboard/solve', icon: '🔬', label: 'Solve'      },
  { href: '/dashboard/lab',   icon: '⚗️', label: 'Virtual Lab' },
  { href: '/dashboard/history',icon: '📋', label: 'History'   },
  { href: '/dashboard/settings',icon: '⚙️',label: 'Settings'  },
  { href: '/dashboard/admin',   icon: '🧠', label: 'Knowledge Base', adminOnly: true },
]

export default function DashboardSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const plan = PLANS[profile?.plan || 'free']
  const limit = plan.limits.problemsPerMonth
  const used = profile?.problems_used || 0
  const pct = limit === -1 ? 100 : Math.min(100, Math.round((used / limit) * 100))

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-60 bg-panel border-r border-white/[0.06] flex flex-col h-full flex-shrink-0">
      {/* Brand */}
      <div className="p-5 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">🔬</span>
          <span className="text-base font-extrabold text-violet group-hover:text-violet/80 transition-colors">Solvr AI</span>
        </Link>
        <p className="text-[10px] text-white/20 font-mono mt-1 ml-0.5">← back to home</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.filter(n => !n.adminOnly || profile?.role === 'admin').map(({ href, icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const locked = href === '/dashboard/lab' && profile?.plan === 'free'
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                active
                  ? 'bg-violet/15 text-violet'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              } ${locked ? 'opacity-50' : ''}`}>
              <span>{icon}</span>
              <span>{label}</span>
              {locked && <span className="ml-auto text-[9px] bg-warn/20 text-warn font-mono px-1.5 py-0.5 rounded">PRO</span>}
            </Link>
          )
        })}
      </nav>

      {/* Usage */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="bg-surface rounded-xl p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-white/40">Problems</span>
            <span className="text-xs font-mono text-white/60">{used}/{limit === -1 ? '∞' : limit}</span>
          </div>
          <div className="w-full bg-raised rounded-full h-1 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct > 80 ? '#ff3b5c' : '#c77dff' }} />
          </div>
          {profile?.plan === 'free' && (
            <Link href="/pricing" className="block text-center text-xs text-violet font-mono mt-2 hover:underline">
              Upgrade plan →
            </Link>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-violet flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {profile?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{profile?.username || 'User'}</div>
            <div className="text-[10px] font-mono text-white/30 capitalize">{profile?.plan || 'free'} plan</div>
          </div>
          <button onClick={logout} title="Sign out"
            className="text-white/20 hover:text-white/60 transition-colors text-lg">
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
