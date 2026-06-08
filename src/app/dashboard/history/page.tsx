'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo, SUBJECT_CONFIG } from '@/lib/utils'
import type { Problem, Subject } from '@/types'
import MathRenderer from '@/components/MathRenderer'

export default function HistoryPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Problem | null>(null)
  const [filter, setFilter]     = useState<Subject | 'all'>('all')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('problems')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
          setProblems(data || [])
          setLoading(false)
        })
    })
  }, [])

  const toggleBookmark = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('problems').update({ is_bookmarked: !current }).eq('id', id)
    setProblems(p => p.map(x => x.id === id ? { ...x, is_bookmarked: !current } : x))
  }

  const displayed = problems.filter(p => {
    if (filter !== 'all' && p.subject !== filter) return false
    if (search && !p.topic?.toLowerCase().includes(search.toLowerCase()) &&
        !p.input_text?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const subjects: (Subject | 'all')[] = ['all', 'mathematics', 'physics', 'chemistry', 'biology']

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-80 flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-panel overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h1 className="text-base font-extrabold mb-3">Problem History</h1>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics..."
            className="w-full bg-surface border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-violet/50 mb-3" />
          <div className="flex flex-wrap gap-1">
            {subjects.map(s => {
              const cfg = s !== 'all' ? SUBJECT_CONFIG[s] : null
              return (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                    filter === s ? 'border-current' : 'border-white/10 text-white/30 hover:text-white/60'
                  }`}
                  style={filter === s && cfg ? { color: cfg.color, borderColor: cfg.color } : {}}>
                  {cfg ? `${cfg.icon} ${s}` : 'All'}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading && <div className="p-4 text-xs text-white/30 font-mono text-center">Loading...</div>}
          {!loading && displayed.length === 0 && (
            <div className="p-6 text-center">
              <div className="text-2xl mb-2 opacity-20">📭</div>
              <div className="text-xs text-white/30 font-mono">No problems found</div>
            </div>
          )}
          {displayed.map(p => {
            const cfg = SUBJECT_CONFIG[p.subject]
            const isActive = selected?.id === p.id
            return (
              <button key={p.id} onClick={() => setSelected(p)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isActive ? 'border-violet/40 bg-violet/8' : 'border-white/[0.06] hover:border-white/12 bg-transparent'
                }`}>
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">{cfg?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{p.topic || 'Untitled'}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono" style={{ color: cfg?.color }}>{p.subject}</span>
                      {p.difficulty && <>
                        <span className="text-white/20">·</span>
                        <span className="text-[10px] font-mono text-white/30">{p.difficulty}</span>
                      </>}
                      <span className="text-white/20">·</span>
                      <span className="text-[10px] font-mono text-white/25">{timeAgo(p.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleBookmark(p.id, p.is_bookmarked) }}
                    className={`text-sm flex-shrink-0 ${p.is_bookmarked ? 'text-warn' : 'text-white/15 hover:text-white/40'}`}>
                    {p.is_bookmarked ? '★' : '☆'}
                  </button>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Solution viewer */}
      <div className="flex-1 overflow-y-auto p-8">
        {!selected && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3 opacity-20">📋</div>
            <div className="text-base font-bold text-white/30">Select a problem to view</div>
          </div>
        )}
        {selected && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold">{selected.topic || 'Solution'}</h2>
                <div className="text-xs text-white/40 font-mono mt-0.5">
                  {selected.subject} · {selected.difficulty} · {timeAgo(selected.created_at)}
                  {selected.processing_time_ms && ` · ${selected.processing_time_ms}ms`}
                </div>
              </div>
            </div>

            {selected.input_text && (
              <div className="bg-surface border border-white/[0.08] rounded-xl p-4 mb-6">
                <div className="text-[10px] font-mono text-white/30 mb-2">ORIGINAL PROBLEM</div>
                <p className="text-sm text-white/70 font-mono">{selected.input_text}</p>
              </div>
            )}

            {selected.key_formulas && selected.key_formulas.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selected.key_formulas.map(f => (
                  <span key={f} className="text-xs font-mono bg-surface border border-white/10 px-2 py-1 rounded text-white/50">{f}</span>
                ))}
              </div>
            )}

            {selected.solution_markdown && (
              <MathRenderer>
                {selected.solution_markdown}
              </MathRenderer>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
