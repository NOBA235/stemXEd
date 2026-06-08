'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// ── Minimal subject data inline (full data lives in data/subjects.ts) ─────────
const SUBJECTS: Record<string, {
  name: string; icon: string; color: string
  items: { id: string; label: string; name: string; emoji: string; color?: string }[]
  equipment: { id: string; label: string; emoji: string; name?: string }[]
  actions: { id: string; label: string; icon: string }[]
}> = {
  chemistry: {
    name: 'Chemistry', icon: '⚗️', color: '#39ff8f',
    items: [
      { id: 'HCl',   label: 'HCl',    name: 'Hydrochloric Acid',  emoji: '🧪', color: '#ffca3a' },
      { id: 'NaOH',  label: 'NaOH',   name: 'Sodium Hydroxide',   emoji: '🧪', color: '#39ff8f' },
      { id: 'H2O2',  label: 'H₂O₂',  name: 'Hydrogen Peroxide',  emoji: '🧪', color: '#00d4ff' },
      { id: 'H2SO4', label: 'H₂SO₄', name: 'Sulfuric Acid',      emoji: '🧪', color: '#ff6b35' },
      { id: 'Na',    label: 'Na',     name: 'Sodium Metal',       emoji: '⚡', color: '#ffd700' },
      { id: 'Mg',    label: 'Mg',     name: 'Magnesium',          emoji: '✨', color: '#e0e0e0' },
      { id: 'H2O',   label: 'H₂O',   name: 'Distilled Water',    emoji: '💧', color: '#4fc3f7' },
      { id: 'KMnO4', label: 'KMnO₄', name: 'Potassium Perm.',    emoji: '💜', color: '#c77dff' },
      { id: 'CuSO4', label: 'CuSO₄', name: 'Copper Sulfate',     emoji: '💎', color: '#1e90ff' },
      { id: 'Zn',    label: 'Zn',     name: 'Zinc',               emoji: '🪙', color: '#b0b0b0' },
    ],
    equipment: [
      { id: 'beaker', label: 'Beaker', emoji: '🥃' },
      { id: 'bunsen', label: 'Bunsen Burner', emoji: '🔥' },
      { id: 'flask',  label: 'Flask',  emoji: '⚗️' },
    ],
    actions: [
      { id: 'mix',       label: 'MIX',    icon: '🔀' },
      { id: 'heat',      label: 'HEAT',   icon: '🔥' },
      { id: 'dilute',    label: 'DILUTE', icon: '💧' },
      { id: 'electrolysis', label: 'ELECTROLYZE', icon: '⚡' },
      { id: 'observe',   label: 'OBSERVE',icon: '🔬' },
      { id: 'combust',   label: 'IGNITE', icon: '💥' },
    ],
  },
  physics: {
    name: 'Physics', icon: '⚡', color: '#00d4ff',
    items: [
      { id: 'pendulum', label: 'Pendulum',     name: 'Simple Pendulum',  emoji: '🔵' },
      { id: 'spring',   label: 'Spring',       name: 'Coiled Spring',    emoji: '🌀' },
      { id: 'ball',     label: 'Ball',         name: 'Projectile Ball',  emoji: '⚪' },
      { id: 'resistor', label: 'Resistor',     name: 'Resistor 10Ω',    emoji: '📊' },
      { id: 'battery',  label: 'Battery',      name: '9V Battery',       emoji: '🔋' },
      { id: 'led',      label: 'LED',          name: 'Light Emitting Diode', emoji: '💡' },
      { id: 'prism',    label: 'Prism',        name: 'Glass Prism',      emoji: '🔺' },
      { id: 'magnet',   label: 'Bar Magnet',   name: 'Permanent Magnet', emoji: '🧲' },
      { id: 'fork',     label: 'Tuning Fork',  name: '440Hz Fork',       emoji: '🎵' },
      { id: 'mirror',   label: 'Mirror',       name: 'Concave Mirror',   emoji: '🪞' },
    ],
    equipment: [
      { id: 'bench',     label: 'Lab Bench',   emoji: '🔬' },
      { id: 'meter',     label: 'Multimeter',  emoji: '📏' },
    ],
    actions: [
      { id: 'release',     label: 'RELEASE',    icon: '⬇️' },
      { id: 'push',        label: 'PUSH',       icon: '👊' },
      { id: 'connect',     label: 'CONNECT',    icon: '🔌' },
      { id: 'heat',        label: 'HEAT',       icon: '🌡️' },
      { id: 'vibrate',     label: 'VIBRATE',    icon: '〰️' },
      { id: 'shine light', label: 'ILLUMINATE', icon: '🔦' },
    ],
  },
  mathematics: {
    name: 'Mathematics', icon: '📐', color: '#c77dff',
    items: [
      { id: 'y=x²',     label: 'y = x²',    name: 'Quadratic',        emoji: '📈' },
      { id: 'y=sin(x)', label: 'y = sin(x)', name: 'Sine Function',    emoji: '〰️' },
      { id: 'y=e^x',    label: 'y = eˣ',    name: 'Exponential',      emoji: '📊' },
      { id: 'quadratic',label: 'ax²+bx+c',  name: 'Quadratic Eq.',    emoji: '✏️' },
      { id: 'matrix',   label: '2×2 Matrix', name: '2x2 Matrix',      emoji: '⊞' },
      { id: 'circle',   label: 'Circle',     name: 'Unit Circle',      emoji: '⭕' },
      { id: 'triangle', label: 'Triangle',   name: 'Right Triangle',   emoji: '△' },
      { id: 'pi',       label: 'π',          name: 'Pi',               emoji: '🥧' },
      { id: 'fibonacci',label: 'Fibonacci',  name: 'Fibonacci Seq.',   emoji: '🌀' },
      { id: 'vector',   label: 'Vector',     name: '2D Vector',        emoji: '➡️' },
    ],
    equipment: [
      { id: 'calc',   label: 'Calculator',  emoji: '🖩' },
      { id: 'graph',  label: 'Graph Paper', emoji: '📓' },
    ],
    actions: [
      { id: 'differentiate', label: 'DIFFERENTIATE', icon: 'd/dx' },
      { id: 'integrate',     label: 'INTEGRATE',     icon: '∫' },
      { id: 'factor',        label: 'FACTOR',        icon: '÷' },
      { id: 'graph',         label: 'GRAPH',         icon: '📈' },
      { id: 'solve',         label: 'SOLVE',         icon: '=' },
      { id: 'transform',     label: 'TRANSFORM',     icon: '↻' },
    ],
  },
  biology: {
    name: 'Biology', icon: '🧬', color: '#ff6b35',
    items: [
      { id: 'animal_cell',  label: 'Animal Cell', name: 'Eukaryotic Cell',  emoji: '🔴' },
      { id: 'plant_cell',   label: 'Plant Cell',  name: 'Plant Cell',       emoji: '🟢' },
      { id: 'dna',          label: 'DNA',         name: 'DNA Double Helix', emoji: '🧬' },
      { id: 'enzyme',       label: 'Enzyme',      name: 'Enzyme',           emoji: '🔑' },
      { id: 'atp',          label: 'ATP',         name: 'ATP',              emoji: '⚡' },
      { id: 'chloroplast',  label: 'Chloroplast', name: 'Chloroplast',      emoji: '🌿' },
      { id: 'mitochondria', label: 'Mitochondria',name: 'Mitochondria',     emoji: '🔋' },
      { id: 'neuron',       label: 'Neuron',      name: 'Nerve Cell',       emoji: '🧠' },
      { id: 'bacterium',    label: 'Bacterium',   name: 'E. coli',          emoji: '🦠' },
      { id: 'glucose',      label: 'Glucose',     name: 'C₆H₁₂O₆',        emoji: '🍬' },
    ],
    equipment: [
      { id: 'microscope', label: 'Microscope', emoji: '🔬' },
      { id: 'petri',      label: 'Petri Dish', emoji: '🧫' },
    ],
    actions: [
      { id: 'incubate', label: 'INCUBATE', icon: '🌡️' },
      { id: 'mutate',   label: 'MUTATE',   icon: '☢️' },
      { id: 'catalyze', label: 'CATALYZE', icon: '⚡' },
      { id: 'divide',   label: 'DIVIDE',   icon: '÷' },
      { id: 'observe',  label: 'OBSERVE',  icon: '🔬' },
      { id: 'evolve',   label: 'EVOLVE',   icon: '🧬' },
    ],
  },
}

interface ExperimentResult {
  outcome: string; equation: string; explanation: string
  realWorldUse: string; safetyWarning: string; visualEffect: string; funFact?: string
}

export default function LabClient({ subjectId }: { subjectId: string }) {
  const router = useRouter()
  const subject = SUBJECTS[subjectId]
  const [selected, setSelected] = useState<string[]>([])
  const [action, setAction]     = useState(subject?.actions[0]?.id || '')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<ExperimentResult | null>(null)
  const [isAnimating, setAnimating] = useState(false)

  useEffect(() => { setSelected([]); setResult(null); setAction(subject?.actions[0]?.id || '') }, [subjectId])
  useEffect(() => {
    if (result) { setAnimating(true); const t = setTimeout(() => setAnimating(false), 8000); return () => clearTimeout(t) }
  }, [result])

  const toggle = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const runExperiment = useCallback(async () => {
    const inputs = selected.filter(id => subject.items.find(i => i.id === id))
    if (!inputs.length) { toast.error('Select at least one item'); return }
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/lab/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subjectId, inputs, equipment: selected.filter(id => subject.equipment.find(e => e.id === id)), action }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      setResult(data.result)
    } catch { toast.error('Connection error') }
    finally { setLoading(false) }
  }, [selected, action, subjectId, subject])

  if (!subject) return null

  return (
    <div className="flex h-full overflow-hidden bg-[#090910]">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 border-r border-white/[0.06] bg-[#0f0f1a] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-white/[0.06]">
          <button onClick={() => router.push('/dashboard/lab')} className="text-xs font-mono text-white/30 hover:text-white/60 mb-2 block">← Labs</button>
          <div className="flex items-center gap-2">
            <span>{subject.icon}</span>
            <span className="text-sm font-bold" style={{ color: subject.color }}>{subject.name}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[...subject.items, ...subject.equipment].map(item => {
            const sel = selected.includes(item.id)
            const color = (item as any).color || subject.color
            return (
              <button key={item.id} onClick={() => toggle(item.id)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left border transition-all text-xs"
                style={{ borderColor: sel ? color : 'rgba(255,255,255,0.05)', background: sel ? `${color}08` : 'transparent' }}>
                <span>{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-semibold truncate" style={{ color: sel ? color : 'rgba(255,255,255,0.75)' }}>{item.label}</div>
                  <div className="text-[9px] text-white/30 truncate">{item.name}</div>
                </div>
                {sel && <span style={{ color }} className="text-[10px] font-bold">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main bench */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {/* Vessel / animation area */}
        <div className="flex-1 bg-[#090910] border border-white/[0.06] rounded-xl flex items-center justify-center relative overflow-hidden" style={{ minHeight: 200 }}>
          {isAnimating && result && (
            <motion.div className="absolute inset-0 opacity-10 rounded-xl" initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} style={{ background: subject.color }} />
          )}
          <div className="flex flex-col items-center gap-4">
            <motion.div className="w-24 h-32 border-2 border-white/10 rounded-b-2xl relative overflow-hidden flex items-end"
              animate={isAnimating ? { boxShadow: [`0 0 20px ${subject.color}33`, `0 0 50px ${subject.color}55`, `0 0 20px ${subject.color}33`] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}>
              <motion.div className="w-full rounded-b-xl"
                style={{ background: `linear-gradient(to top, ${subject.color}60, ${subject.color}20)` }}
                animate={isAnimating ? { height: ['30%', '45%', '30%'] } : { height: '30%' }}
                transition={{ repeat: Infinity, duration: 1.5 }} />
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xl opacity-20">⚗</span>
            </motion.div>
            {isAnimating && result && (
              <motion.div className="text-xs font-mono px-3 py-1 border rounded"
                style={{ color: subject.color, borderColor: subject.color }}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>● </motion.span>
                {result.visualEffect.toUpperCase()}
              </motion.div>
            )}
            {!isAnimating && <div className="text-xs font-mono text-white/20">SELECT ITEMS AND RUN</div>}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-6 gap-2">
          {subject.actions.map(a => (
            <button key={a.id} onClick={() => setAction(a.id)}
              className="flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-all"
              style={{ borderColor: action === a.id ? subject.color : 'rgba(255,255,255,0.06)', background: action === a.id ? `${subject.color}12` : 'transparent', color: action === a.id ? subject.color : 'rgba(255,255,255,0.4)' }}>
              <span>{a.icon}</span>
              <span className="font-mono text-[9px]">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Run */}
        <motion.button onClick={runExperiment} disabled={loading || !selected.length}
          style={{ background: selected.length && !loading ? subject.color : '#1a1a2e', color: selected.length && !loading ? '#000' : 'rgba(255,255,255,0.2)' }}
          className="py-3 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed"
          whileHover={selected.length ? { scale: 1.01 } : {}} whileTap={selected.length ? { scale: 0.99 } : {}}>
          {loading ? '⚗ Analysing...' : `▶ Run ${subject.actions.find(a => a.id === action)?.label || ''} Experiment`}
        </motion.button>
      </div>

      {/* Result panel */}
      <div className="w-72 flex-shrink-0 border-l border-white/[0.06] bg-[#0f0f1a] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: subject.color, boxShadow: `0 0 6px ${subject.color}` }} />
          <span className="text-[10px] font-mono text-white/40 tracking-widest">AI ANALYSIS</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loading && (
            <div className="flex items-center gap-3 p-2">
              <motion.span className="text-2xl" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>⚗</motion.span>
              <div className="text-xs text-white/50 font-mono">Claude is analysing...</div>
            </div>
          )}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="text-3xl mb-2 opacity-20">{subject.icon}</div>
              <div className="text-xs text-white/30 font-mono">Run an experiment to see results</div>
            </div>
          )}
          {result && !loading && [
            { icon: '🔬', label: 'OUTCOME',    val: result.outcome,       color: subject.color },
            { icon: '⚖️', label: 'EQUATION',   val: result.equation,      mono: true, color: '#00d4ff' },
            { icon: '📚', label: 'EXPLANATION',val: result.explanation,   color: '#c77dff' },
            { icon: '🌍', label: 'REAL WORLD', val: result.realWorldUse,  color: '#ff6b35' },
            { icon: '⚠️', label: 'SAFETY',     val: result.safetyWarning, color: '#ffca3a', warn: true },
            ...(result.funFact ? [{ icon: '💡', label: 'FUN FACT', val: result.funFact, color: '#39ff8f' }] : []),
          ].map(({ icon, label, val, color, mono, warn }) => (
            <motion.div key={label} className="rounded-lg p-2.5"
              style={{ background: warn ? 'rgba(255,202,58,0.06)' : '#14142480', border: `1px solid ${warn ? 'rgba(255,202,58,0.2)' : 'rgba(255,255,255,0.06)'}` }}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs">{icon}</span>
                <span className="text-[9px] font-mono tracking-widest" style={{ color }}>{label}</span>
              </div>
              <p className={`text-xs leading-relaxed ${mono ? 'font-mono' : ''}`}
                style={{ color: warn ? '#ffca3a' : mono ? '#00d4ff' : 'rgba(255,255,255,0.65)' }}>
                {val}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
