'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export const CURRICULA = [
  { id: 'NCERT',   label: 'NCERT',        flag: '🇮🇳', desc: 'Classes 9–12' },
  { id: 'CBSE',    label: 'CBSE',         flag: '🇮🇳', desc: 'Board exams' },
  { id: 'JEE',     label: 'JEE / NEET',  flag: '🇮🇳', desc: 'Entrance exams' },
  { id: 'IGCSE',   label: 'IGCSE',        flag: '🌐', desc: 'Cambridge' },
  { id: 'AP',      label: 'AP',           flag: '🇺🇸', desc: 'Advanced Placement' },
  { id: 'IB',      label: 'IB',           flag: '🌐', desc: 'International Baccalaureate' },
  { id: 'OpenStax',label: 'College / Uni',flag: '🎓', desc: 'Undergraduate' },
]

const STORAGE_KEY = 'solvr_curriculum'

interface CurriculumSelectorProps {
  value:    string
  onChange: (curriculum: string) => void
}

export default function CurriculumSelector({ value, onChange }: CurriculumSelectorProps) {
  const [open, setOpen] = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) onChange(saved)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const select = (id: string) => {
    onChange(id)
    localStorage.setItem(STORAGE_KEY, id)
    setOpen(false)
  }

  const current = CURRICULA.find(c => c.id === value) ?? CURRICULA[0]

  return (
    <div className="relative">
      <p className="text-xs text-white/40 font-mono mb-2">Your curriculum</p>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 bg-surface border border-white/[0.08] rounded-xl px-4 py-2.5 hover:border-white/15 transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{current.flag}</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-white/80">{current.label}</div>
            <div className="text-[10px] text-white/30 font-mono">{current.desc}</div>
          </div>
        </div>
        <motion.span
          className="text-white/25 text-xs"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-1.5 bg-panel border border-white/[0.1] rounded-xl overflow-hidden z-50 shadow-2xl"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {CURRICULA.map(c => (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] transition-colors ${
                  c.id === value ? 'bg-violet/10' : ''
                }`}
              >
                <span className="text-base">{c.flag}</span>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${c.id === value ? 'text-violet' : 'text-white/70'}`}>
                    {c.label}
                  </div>
                  <div className="text-[10px] text-white/25 font-mono">{c.desc}</div>
                </div>
                {c.id === value && (
                  <span className="text-violet text-xs">✓</span>
                )}
              </button>
            ))}
            <div className="px-4 py-2 border-t border-white/[0.06]">
              <p className="text-[10px] text-white/20 font-mono">
                We use this to find matching textbook content
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
