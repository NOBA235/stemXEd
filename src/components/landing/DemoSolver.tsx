'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion }    from 'framer-motion'

const SUBJECTS = [
  { id: 'mathematics', label: 'Maths',     icon: '📐', color: '#c77dff' },
  { id: 'physics',     label: 'Physics',   icon: '⚡', color: '#00d4ff' },
  { id: 'chemistry',   label: 'Chemistry', icon: '⚗️', color: '#39ff8f' },
  { id: 'biology',     label: 'Biology',   icon: '🧬', color: '#ff6b35' },
]

const EXAMPLES: Record<string, string[]> = {
  mathematics: ['Solve x² - 5x + 6 = 0', 'Derivative of x³ + 2x', 'Area of circle with radius 5cm'],
  physics:     ['Ball dropped from 80m — time to land?', 'Force to accelerate 8kg at 3 m/s²', 'Explain Ohm\'s Law'],
  chemistry:   ['What happens when sodium meets water?', 'Balance: H₂ + O₂ → H₂O', 'pH of 0.01M HCl'],
  biology:     ['How does photosynthesis work?', 'Role of mitochondria in a cell', 'Mitosis vs meiosis'],
}

export default function DemoSolver() {
  const [subject, setSubject] = useState('mathematics')
  const [text, setText]       = useState('')
  const router                = useRouter()
  const active                = SUBJECTS.find(s => s.id === subject)!

  const goToSignup = () => {
    // Store what they typed so signup page can show it
    if (text.trim()) sessionStorage.setItem('solvr_demo_q', text.trim())
    router.push('/auth/register')
  }

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-acid/10 border border-acid/25
                        rounded-full px-4 py-1.5 text-xs font-mono text-acid mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse-slow inline-block" />
          Try it now — free, no card needed
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">
          Ask any STEM question
        </h2>
        <p className="text-white/40 font-mono text-sm">
          Type your question and see Claude solve it step by step
        </p>
      </div>

      {/* Card */}
      <div className="bg-panel border border-white/[0.08] rounded-2xl overflow-hidden
                      shadow-[0_0_80px_rgba(199,125,255,0.07)]">

        {/* Subject tabs */}
        <div className="flex border-b border-white/[0.06]">
          {SUBJECTS.map(s => (
            <button key={s.id} onClick={() => setSubject(s.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3
                         text-sm font-semibold transition-all border-b-2"
              style={{
                borderBottomColor: subject === s.id ? s.color : 'transparent',
                color:             subject === s.id ? s.color : 'rgba(255,255,255,0.35)',
                background:        subject === s.id ? `${s.color}08` : 'transparent',
              }}>
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* Example chips */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES[subject].map(ex => (
              <button key={ex} onClick={() => setText(ex)}
                className="text-xs font-mono px-3 py-1.5 rounded-lg border
                           border-white/[0.08] text-white/45 hover:text-white/80
                           hover:border-white/20 transition-all text-left">
                {ex}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goToSignup()}
              placeholder={`Type any ${active.label.toLowerCase()} question...`}
              className="flex-1 bg-surface border border-white/[0.08] rounded-xl px-4 py-3
                         text-sm font-mono text-white placeholder-white/20
                         focus:outline-none focus:border-violet/40 transition-colors"
            />
            <motion.button
              onClick={goToSignup}
              style={{
                background: active.color,
                color: '#000',
              }}
              className="px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap"
              whileHover={{ scale: 1.03, boxShadow: `0 0 24px ${active.color}60` }}
              whileTap={{ scale: 0.97 }}
            >
              ✨ Solve
            </motion.button>
          </div>

          {/* Bottom hint */}
          <p className="text-center text-xs text-white/20 font-mono">
            Press Enter or click Solve — takes 10 seconds to sign up
          </p>
        </div>
      </div>

      {/* Trust row */}
      <div className="flex items-center justify-center gap-6 mt-5
                      text-xs text-white/25 font-mono">
        {['Free forever plan', 'No credit card', 'Instant answers'].map(t => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="text-acid">✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  )
}
