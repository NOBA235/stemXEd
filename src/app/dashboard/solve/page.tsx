'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import MathRenderer from '@/components/MathRenderer'
import VideoRecommendation from '@/components/VideoRecommendation'
import CurriculumSelector from '@/components/CurriculumSelector'
import { fileToBase64, SUBJECT_CONFIG } from '@/lib/utils'
import type { Subject } from '@/types'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
type SolveState = 'idle' | 'solving' | 'done' | 'error'

interface SolutionMeta {
  topic?:            string
  difficulty?:       string
  keyFormulas?:      string[]
  processingTimeMs?: number
  classLevel?:       number
  chapter?:          string
  conceptTags?:      string[]
  video?:            { youtube_id: string; title: string } | null
}

// ── Subject options — icon + friendly label only ──────────────────────────────
const SUBJECTS = [
  { id: 'mathematics' as Subject, label: 'Maths',     icon: '📐', color: '#c77dff' },
  { id: 'physics'     as Subject, label: 'Physics',   icon: '⚡', color: '#00d4ff' },
  { id: 'chemistry'   as Subject, label: 'Chemistry', icon: '⚗️', color: '#39ff8f' },
  { id: 'biology'     as Subject, label: 'Biology',   icon: '🧬', color: '#ff6b35' },
  { id: 'general'     as Subject, label: 'Other',     icon: '🔬', color: '#90a4ae' },
]

// ── Example prompts shown to student when input is empty ──────────────────────
const EXAMPLES: Record<Subject | 'general', string[]> = {
  mathematics: [
    'A car travels 150km in 2.5 hours. What is its average speed?',
    'Find the area of a circle with radius 7cm',
    'Solve for x: 3x + 12 = 33',
    'What is the derivative of x² + 5x?',
  ],
  physics: [
    'A ball is dropped from 45m. How long to hit the ground?',
    'What force is needed to accelerate a 10kg object at 3 m/s²?',
    'A wire carries 2A through a 5Ω resistor. What is the voltage?',
    'An object moves at 60 m/s and decelerates at 4 m/s². How far to stop?',
  ],
  chemistry: [
    'What happens when sodium is added to water?',
    'Balance this equation: H₂ + O₂ → H₂O',
    'What is the pH of a 0.01M HCl solution?',
    'Describe the reaction between acids and bases',
  ],
  biology: [
    'Explain how photosynthesis works',
    'What is the role of mitochondria in a cell?',
    'How does DNA replication occur?',
    'What is the difference between mitosis and meiosis?',
  ],
  general: [
    'Explain Newton\'s three laws of motion',
    'What is the difference between speed and velocity?',
    'How do vaccines work?',
    'What causes rainbows?',
  ],
}

// ── Solution section header pill ─────────────────────────────────────────────
function SectionPill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <span className="text-[11px] font-mono tracking-widest font-bold uppercase"
        style={{ color }}>
        {label}
      </span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SolvePage() {
  const [subject, setSubject]     = useState<Subject>('mathematics')
  const [text, setText]           = useState('')
  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [state, setState]         = useState<SolveState>('idle')
  const [solution, setSolution]   = useState('')
  const [metadata, setMetadata]   = useState<SolutionMeta | null>(null)
  const [showExamples, setShowExamples] = useState(true)
  const [curriculum, setCurriculum]   = useState('NCERT')
  const solutionRef = useRef<HTMLDivElement>(null)
  const readerRef   = useRef<ReadableStreamDefaultReader | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeSubject = SUBJECTS.find(s => s.id === subject)!

  // Auto-scroll solution as it streams in
  useEffect(() => {
    if (state === 'solving') {
      solutionRef.current?.scrollTo({ top: solutionRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [solution, state])

  // Hide examples once the student starts typing
  useEffect(() => {
    setShowExamples(text.length === 0 && !file)
  }, [text, file])

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setText('')  // clear text when photo added
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    onDropRejected: () => toast.error('Image too large or wrong type. Use JPG/PNG under 10MB.'),
  })

  const clearInput = () => {
    setFile(null)
    setPreview(null)
    setText('')
    textareaRef.current?.focus()
  }

  const handleSolve = async () => {
    // Stop if already solving
    if (state === 'solving') {
      readerRef.current?.cancel()
      setState('idle')
      return
    }

    const hasText  = text.trim().length >= 3
    const hasImage = !!file

    if (!hasText && !hasImage) {
      toast.error('Type your question or upload a photo first')
      textareaRef.current?.focus()
      return
    }

    setState('solving')
    setSolution('')
    setMetadata(null)

    try {
      const body: Record<string, unknown> = {
        subject,
        inputType: hasImage ? 'image' : 'text',
        curriculum,
      }

      if (hasImage && file) {
        body.fileBase64 = await fileToBase64(file)
        body.mimeType   = file.type
      } else {
        body.text = text.trim()
      }

      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Something went wrong' }))
        // Show friendly messages — no technical jargon
        if (res.status === 402) {
          toast.error("You've used all your problems this month. Tap 'Upgrade' in the menu to continue.", { duration: 6000 })
        } else if (res.status === 429) {
          toast.error("You're going too fast! Wait a moment and try again.")
        } else if (res.status === 403) {
          toast.error('Photo upload is available on the Basic plan. Upgrade to use this feature.')
        } else {
          toast.error(err.error || 'Something went wrong. Please try again.')
        }
        setState('error')
        return
      }

      // Stream the response token by token
      const reader  = res.body!.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'delta')  setSolution(prev => prev + data.content)
            if (data.type === 'done')   { setMetadata(data.metadata as SolutionMeta); setState('done') }
            if (data.type === 'error')  { toast.error('AI error. Please try again.'); setState('error') }
          } catch { /* ignore malformed chunks */ }
        }
      }
    } catch {
      toast.error('Connection lost. Check your internet and try again.')
      setState('error')
    }
  }

  const handleNewQuestion = () => {
    setState('idle')
    setSolution('')
    setMetadata(null)
    // Don't clear the text — student might want to tweak and resubmit
  }

  const handleExampleClick = (example: string) => {
    setText(example)
    textareaRef.current?.focus()
  }

  // Friendly difficulty badge
  const difficultyStyle: Record<string, { label: string; color: string; bg: string }> = {
    easy:   { label: 'Easy',   color: '#39ff8f', bg: 'rgba(57,255,143,0.1)'  },
    medium: { label: 'Medium', color: '#ffca3a', bg: 'rgba(255,202,58,0.1)'  },
    hard:   { label: 'Hard',   color: '#ff6b35', bg: 'rgba(255,107,53,0.1)'  },
    expert: { label: 'Expert', color: '#ff3b5c', bg: 'rgba(255,59,92,0.1)'   },
  }

  return (
    <div className="flex h-full overflow-hidden bg-void">

      {/* ══ LEFT — Input panel ══════════════════════════════════════════════ */}
      <div className="w-[400px] flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden bg-panel">

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h1 className="text-lg font-extrabold tracking-tight">Ask a question</h1>
          <p className="text-xs text-white/40 font-mono mt-0.5">
            Type it or take a photo — we do the rest
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Subject picker ─────────────────────────────────────────── */}
          <div>
            <p className="text-xs text-white/40 font-mono mb-2">What subject is this?</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <button key={s.id} onClick={() => setSubject(s.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all"
                  style={subject === s.id
                    ? { borderColor: s.color, color: s.color, background: `${s.color}15` }
                    : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                  }>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Curriculum selector ────────────────────────────────────── */}
          <CurriculumSelector value={curriculum} onChange={setCurriculum} />

          {/* ── Text input ─────────────────────────────────────────────── */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Type your ${activeSubject.label.toLowerCase()} question here...`}
              rows={5}
              disabled={!!file}
              maxLength={4000}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.metaKey) handleSolve()
              }}
              className="w-full bg-surface border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet/40 transition-colors resize-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            {text && (
              <button onClick={() => setText('')}
                className="absolute top-2.5 right-2.5 text-white/20 hover:text-white/50 transition-colors text-xs">
                ✕
              </button>
            )}
          </div>

          {/* ── OR divider ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-white/25 font-mono">or upload a photo</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* ── Photo upload — prominent, dead simple ──────────────────── */}
          <div>
            {!file ? (
              <div {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-violet bg-violet/10'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                }`}>
                <input {...getInputProps()} />
                <div className="text-3xl mb-2">📸</div>
                <p className="text-sm font-semibold text-white/60 mb-0.5">
                  {isDragActive ? 'Drop it here!' : 'Take a photo of your question'}
                </p>
                <p className="text-xs text-white/25 font-mono">
                  Works with textbooks, worksheets, whiteboards
                </p>
              </div>
            ) : (
              <div className="relative">
                {preview ? (
                  <img src={preview} alt="Your question"
                    className="w-full max-h-48 object-contain rounded-xl border border-white/10 bg-black/30" />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-surface border border-white/10 rounded-xl">
                    <span className="text-2xl">📄</span>
                    <span className="text-sm text-white/60 font-mono truncate">{file.name}</span>
                  </div>
                )}
                <button onClick={clearInput}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 border border-white/20 text-white/60 hover:text-white flex items-center justify-center text-xs transition-colors">
                  ✕
                </button>
                <p className="text-xs text-white/30 font-mono text-center mt-2">Photo ready ✓</p>
              </div>
            )}
          </div>

          {/* ── Example questions — only when input is empty ───────────── */}
          <AnimatePresence>
            {showExamples && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <p className="text-xs text-white/30 font-mono mb-2">Try an example:</p>
                <div className="space-y-2">
                  {EXAMPLES[subject].map((ex, i) => (
                    <motion.button key={ex} onClick={() => handleExampleClick(ex)}
                      className="w-full text-left text-xs text-white/50 bg-surface border border-white/[0.06] rounded-lg px-3 py-2.5 hover:border-white/15 hover:text-white/70 transition-all"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}>
                      "{ex}"
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Solve button — always visible at bottom ────────────────────── */}
        <div className="p-4 border-t border-white/[0.06]">
          <motion.button onClick={handleSolve}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: state === 'solving'
                ? '#ff3b5c'
                : (text.trim() || file) ? activeSubject.color : 'rgba(255,255,255,0.06)',
              color: (text.trim() || file || state === 'solving') ? '#000' : 'rgba(255,255,255,0.2)',
            }}
            whileHover={(text.trim() || file) ? { scale: 1.01 } : {}}
            whileTap={(text.trim() || file)   ? { scale: 0.99 } : {}}>
            {state === 'solving'
              ? '■  Stop'
              : file
              ? '✨  Solve this photo'
              : text.trim()
              ? '✨  Get solution'
              : 'Type a question above'}
          </motion.button>
          {(text.trim() || file) && state !== 'solving' && (
            <p className="text-center text-[10px] text-white/20 font-mono mt-2">
              Tip: Press ⌘ + Enter to solve quickly
            </p>
          )}
        </div>
      </div>

      {/* ══ RIGHT — Solution panel ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Solution topbar */}
        <div className="flex items-center justify-between px-7 py-3.5 border-b border-white/[0.06] flex-shrink-0 bg-void/60">
          <div className="flex items-center gap-3">
            <span className="text-xl">{activeSubject.icon}</span>
            <div>
              <div className="text-sm font-bold" style={{ color: activeSubject.color }}>
                {state === 'done' && metadata?.topic
                  ? String(metadata.topic)
                  : activeSubject.label}
              </div>
              <div className="text-[11px] text-white/30 font-mono">
                {state === 'solving' && 'Working it out...'}
                {state === 'done'    && 'Solution ready'}
                {state === 'idle'    && 'Waiting for your question'}
                {state === 'error'   && 'Something went wrong'}
              </div>
            </div>
          </div>

          {/* Metadata badges — shown after solution completes */}
          <div className="flex items-center gap-2">
            {state === 'done' && !!metadata?.difficulty && (() => {
              const diff = metadata?.difficulty ?? ''
              const ds = difficultyStyle[diff] ?? difficultyStyle.medium
              return (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg"
                  style={ds}>
                  {ds.label}
                </motion.span>
              )
            })()}
            {state === 'done' && metadata?.processingTimeMs && (
              <span className="text-[10px] text-white/20 font-mono">
                {(metadata.processingTimeMs / 1000).toFixed(1)}s
              </span>
            )}
            {state === 'done' && (
              <motion.button
                onClick={handleNewQuestion}
                className="text-[11px] font-mono text-white/30 hover:text-white/60 border border-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                New question
              </motion.button>
            )}
          </div>
        </div>

        {/* Solution body */}
        <div ref={solutionRef} className="flex-1 overflow-y-auto px-7 py-6">

          {/* ── Idle state ─────────────────────────────────────────────── */}
          {state === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="text-6xl mb-5 opacity-20">
                {activeSubject.icon}
              </motion.div>
              <p className="text-base font-bold text-white/25 mb-2">Your solution will appear here</p>
              <p className="text-sm text-white/15 font-mono max-w-xs leading-relaxed">
                Ask anything — type it out or snap a photo of your question
              </p>
            </div>
          )}

          {/* ── Solving — show a friendly progress indicator ───────────── */}
          {state === 'solving' && !solution && (
            <div className="flex flex-col items-center justify-center h-full gap-5">
              <motion.div className="text-4xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                🧠
              </motion.div>
              <div className="text-center">
                <p className="text-base font-semibold text-white/60 mb-1">Working it out...</p>
                <p className="text-xs text-white/25 font-mono">AI is reading your question</p>
              </div>
              {/* Animated dots */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-violet"
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
                ))}
              </div>
            </div>
          )}

          {/* ── Solution streaming / done ──────────────────────────────── */}
          {(state === 'solving' || state === 'done') && solution && (
            <div className="max-w-3xl">
              <MathRenderer streaming={state === 'solving'}>
                {solution}
              </MathRenderer>

              {/* Key formulas — shown as friendly chips after completion */}
              {state === 'done' && metadata?.keyFormulas && metadata.keyFormulas.length > 0 && (
                <motion.div
                  className="mt-6 pt-5 border-t border-white/[0.06]"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <SectionPill icon="📌" label="Key formulas used" color={activeSubject.color} />
                  <div className="flex flex-wrap gap-2">
                    {(metadata?.keyFormulas ?? []).map((f: string) => (
                      <div key={f}
                        className="px-3 py-2 rounded-lg text-sm font-mono border"
                        style={{ borderColor: `${activeSubject.color}30`, background: `${activeSubject.color}08`, color: activeSubject.color }}>
                        {f}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Feedback prompt — shown after completion */}
              {state === 'done' && (
                <motion.div
                  className="mt-6 flex items-center gap-3 text-sm"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  <span className="text-white/25 font-mono text-xs">Was this helpful?</span>
                  {['👍', '👎'].map(emoji => (
                    <button key={emoji}
                      className="text-xl hover:scale-125 transition-transform"
                      onClick={() => toast.success(emoji === '👍' ? 'Great! Glad it helped.' : 'Thanks for the feedback.')}>
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Video recommendation — rendered only when backend returns a match */}
              {state === 'done' && metadata?.video?.youtube_id && (
                <VideoRecommendation
                  youtubeId={metadata.video.youtube_id}
                  title={metadata.video.title}
                />
              )}
            </div>
          )}

          {/* ── Error state ─────────────────────────────────────────────── */}
          {state === 'error' && !solution && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="text-5xl">😕</div>
              <div>
                <p className="text-base font-bold text-white/50 mb-1">Something went wrong</p>
                <p className="text-sm text-white/25 font-mono">Check your connection and try again</p>
              </div>
              <button onClick={handleNewQuestion}
                className="text-sm text-violet border border-violet/30 px-5 py-2 rounded-xl hover:bg-violet/10 transition-colors font-mono">
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
