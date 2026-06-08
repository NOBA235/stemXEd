'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

interface KBStat {
  subject:      string
  curriculum:   string
  source_title: string
  chunk_count:  number
}

interface TestResult {
  content:     string
  sourceTitle: string
  chapter:     string | null
  curriculum:  string
  similarity:  number
}

const SUBJECT_COLORS: Record<string, string> = {
  physics:     '#00d4ff',
  mathematics: '#c77dff',
  chemistry:   '#39ff8f',
  biology:     '#ff6b35',
}

export default function AdminKnowledgeBase() {
  const [stats, setStats]         = useState<KBStat[]>([])
  const [loading, setLoading]     = useState(true)
  const [testQuery, setTestQuery] = useState('')
  const [testSubject, setTestSubject] = useState('physics')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testing, setTesting]     = useState(false)
  const [totalChunks, setTotal]   = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_knowledge_base_stats').then(({ data }) => {
      if (data) {
        setStats(data)
        setTotal(data.reduce((a: number, r: KBStat) => a + Number(r.chunk_count), 0))
      }
      setLoading(false)
    })
  }, [])

  const handleTest = async () => {
    if (!testQuery.trim()) return
    setTesting(true)
    setTestResults([])
    try {
      const res = await fetch('/api/admin/test-retrieval', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: testQuery, subject: testSubject }),
      })
      const data = await res.json()
      setTestResults(data.results ?? [])
    } catch {
      console.error('Test failed')
    } finally {
      setTesting(false)
    }
  }

  // Group stats by subject
  const bySubject = stats.reduce((acc, row) => {
    if (!acc[row.subject]) acc[row.subject] = []
    acc[row.subject].push(row)
    return acc
  }, {} as Record<string, KBStat[]>)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">
            Knowledge Base
          </h1>
          <p className="text-sm text-white/40 font-mono">
            RAG content — {totalChunks.toLocaleString()} total chunks
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-white/30 mb-1">To add content:</div>
          <code className="text-xs bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-acid font-mono">
            npx tsx scripts/ingest.ts
          </code>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {['physics', 'mathematics', 'chemistry', 'biology'].map(subject => {
          const rows   = bySubject[subject] ?? []
          const chunks = rows.reduce((a, r) => a + Number(r.chunk_count), 0)
          const color  = SUBJECT_COLORS[subject]
          return (
            <motion.div key={subject}
              className="bg-panel border border-white/[0.07] rounded-xl p-4"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-xs font-mono mb-2 capitalize" style={{ color }}>
                {subject}
              </div>
              <div className="text-2xl font-extrabold mb-0.5" style={{ color }}>
                {chunks.toLocaleString()}
              </div>
              <div className="text-[10px] text-white/30 font-mono">
                chunks · {rows.length} sources
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Sources table */}
      <section className="bg-panel border border-white/[0.08] rounded-2xl mb-8 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold">Ingested Sources</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-white/30 font-mono text-sm">Loading...</div>
        ) : stats.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-3 opacity-20">📚</div>
            <p className="text-sm text-white/40 font-mono mb-2">No content ingested yet</p>
            <p className="text-xs text-white/25 font-mono">
              Download NCERT PDFs and run: <code className="text-acid">npx tsx scripts/ingest.ts</code>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {Object.entries(bySubject).map(([subject, rows]) =>
              rows.map((row, i) => (
                <div key={`${subject}-${i}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: SUBJECT_COLORS[subject] ?? '#666' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{row.source_title}</div>
                    <div className="text-xs text-white/30 font-mono">{row.curriculum}</div>
                  </div>
                  <div className="text-sm font-mono text-white/50">
                    {Number(row.chunk_count).toLocaleString()} chunks
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Retrieval tester */}
      <section className="bg-panel border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold">Test Retrieval Quality</h2>
          <p className="text-xs text-white/30 font-mono mt-0.5">
            See what chunks get retrieved for any question
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <select
              value={testSubject}
              onChange={e => setTestSubject(e.target.value)}
              className="bg-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet/50 w-36 flex-shrink-0"
            >
              {['physics', 'mathematics', 'chemistry', 'biology'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTest()}
              placeholder="e.g. Newton's second law with friction"
              className="flex-1 bg-surface border border-white/[0.08] rounded-xl px-4 py-2 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-violet/50"
            />
            <button
              onClick={handleTest}
              disabled={testing || !testQuery.trim()}
              className="bg-violet text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-violet/90 transition-all disabled:opacity-40"
            >
              {testing ? '...' : 'Test'}
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-white/40 font-mono">
                Top {testResults.length} retrieved chunks:
              </p>
              {testResults.map((r, i) => (
                <motion.div
                  key={i}
                  className="bg-surface border border-white/[0.07] rounded-xl p-4"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-mono text-white/50">
                      {r.sourceTitle}{r.chapter ? ` → ${r.chapter}` : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                        style={{
                          color: r.similarity > 0.8 ? '#39ff8f' : r.similarity > 0.7 ? '#ffca3a' : '#ff6b35',
                          background: r.similarity > 0.8 ? 'rgba(57,255,143,0.1)' : r.similarity > 0.7 ? 'rgba(255,202,58,0.1)' : 'rgba(255,107,53,0.1)',
                        }}
                      >
                        {(r.similarity * 100).toFixed(0)}% match
                      </div>
                      <span className="text-[10px] text-white/25 font-mono">{r.curriculum}</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/55 leading-relaxed line-clamp-4">
                    {r.content}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {testResults.length === 0 && !testing && testQuery && (
            <div className="text-center py-6">
              <div className="text-2xl mb-2 opacity-25">🔍</div>
              <p className="text-sm text-white/30 font-mono">No matching chunks found</p>
              <p className="text-xs text-white/20 font-mono mt-1">
                Try lowering the similarity threshold or adding more content
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
