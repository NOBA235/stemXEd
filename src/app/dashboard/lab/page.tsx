import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const LABS = [
  { id: 'chemistry',   name: 'Chemistry',   icon: '⚗️', color: '#39ff8f', desc: 'Mix reagents, apply heat, discover reactions', count: 18 },
  { id: 'physics',     name: 'Physics',     icon: '⚡', color: '#00d4ff', desc: 'Forces, circuits, waves & optics', count: 16 },
  { id: 'mathematics', name: 'Mathematics', icon: '📐', color: '#c77dff', desc: 'Visualise functions, algebra & geometry', count: 16 },
  { id: 'biology',     name: 'Biology',     icon: '🧬', color: '#ff6b35', desc: 'Cells, DNA, enzymes & ecosystems', count: 16 },
]

export default async function LabPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: expCounts } = await supabase
    .from('experiments')
    .select('subject')
    .eq('user_id', user!.id)

  const countBySubject = (expCounts || []).reduce((acc: Record<string, number>, e) => {
    acc[e.subject] = (acc[e.subject] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Virtual Labs</h1>
        <p className="text-sm text-white/40 font-mono">Interactive simulations for every subject</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {LABS.map(lab => (
          <Link key={lab.id} href={`/dashboard/lab/${lab.id}`}
            className="group bg-panel border border-white/[0.07] rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-1"
            style={{ '--accent': lab.color } as React.CSSProperties}>
            <div className="flex items-start justify-between mb-4">
              <span className="text-3xl">{lab.icon}</span>
              <span className="text-xs font-mono border border-white/10 px-2 py-0.5 rounded text-white/30">
                {countBySubject[lab.id] || 0} runs
              </span>
            </div>
            <h2 className="text-lg font-bold mb-1 group-hover:text-[var(--accent)] transition-colors"
              style={{}}>
              {lab.name}
            </h2>
            <p className="text-xs text-white/40 font-mono mb-4">{lab.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/30 font-mono">{lab.count} items available</span>
              <span className="text-xs font-bold" style={{ color: lab.color }}>Enter lab →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
