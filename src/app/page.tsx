'use client'
import Link                from 'next/link'
import { motion }          from 'framer-motion'
import { useEffect, useState } from 'react'
import { createClient }    from '@/lib/supabase/client'
import DemoSolver          from '@/components/landing/DemoSolver'

const SUBJECTS = [
  { icon: '📐', name: 'Mathematics',  color: '#c77dff',
    examples: ['Integration & Calculus', 'Quadratic equations', 'Trigonometry', 'Matrices'] },
  { icon: '⚡', name: 'Physics',      color: '#00d4ff',
    examples: ['Newton\'s Laws', 'Circuit analysis', 'Projectile motion', 'Thermodynamics'] },
  { icon: '⚗️', name: 'Chemistry',   color: '#39ff8f',
    examples: ['Balancing equations', 'Titration', 'Organic chemistry', 'Electrochemistry'] },
  { icon: '🧬', name: 'Biology',      color: '#ff6b35',
    examples: ['Cell biology', 'DNA & genetics', 'Photosynthesis', 'Human physiology'] },
]

const STEPS = [
  { icon: '📸', title: 'Type or snap',    desc: 'Type your question or upload a photo of your textbook or worksheet' },
  { icon: '🧠', title: 'AI analyses',     desc: 'Claude reads your question, identifies the topic and picks the right method' },
  { icon: '✏️', title: 'Step by step',    desc: 'Get every step shown clearly — not just the answer but why it works' },
]

const FREE_FEATURES = [
  '5 problems every month',
  'All 4 subjects',
  'Full step-by-step solutions',
  'Beautiful maths rendering',
  'No credit card ever',
]

const PAID_FEATURES = [
  'Everything in free',
  'Photo upload — snap your homework',
  'Virtual lab simulations',
  'Unlimited problems',
  'PDF upload',
  'Unlimited history',
]

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user))
  }, [])

  return (
    <div className="min-h-screen bg-void text-white font-display overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-void/80 backdrop-blur-xl
                      border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔬</span>
            <span className="text-xl font-extrabold tracking-tight text-violet">Solvr AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/50 font-mono">
            <a href="#demo"     className="hover:text-white transition-colors">Try it</a>
            <a href="#subjects" className="hover:text-white transition-colors">Subjects</a>
            <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {loggedIn ? (
              <Link href="/dashboard"
                className="text-sm font-bold bg-violet text-white px-4 py-2
                           rounded-lg hover:bg-violet/90 transition-colors">
                Go to dashboard →
              </Link>
            ) : (
              <>
                <Link href="/auth/login"
                  className="text-sm font-mono text-white/50 hover:text-white
                             transition-colors px-4 py-2">
                  Sign in
                </Link>
                <Link href="/auth/register"
                  className="text-sm font-bold bg-violet text-white px-4 py-2
                             rounded-lg hover:bg-violet/90 transition-colors">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dim bg-grid opacity-100 pointer-events-none" />
        <div className="absolute top-32 left-1/4 w-96 h-96 bg-violet/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 right-1/4 w-80 h-80 bg-acid/6  rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}>

            <div className="inline-flex items-center gap-2 bg-violet/10 border border-violet/25
                            rounded-full px-4 py-1.5 text-xs font-mono text-violet mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-violet animate-pulse-slow inline-block" />
              Powered by Claude AI — try it below, no signup
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight
                           leading-[1.06] mb-6">
              Stuck on a problem?<br />
              <span className="gradient-text">Get unstuck in seconds.</span>
            </h1>

            <p className="text-lg text-white/50 font-mono max-w-xl mx-auto mb-10 leading-relaxed">
              Type any Physics, Maths, Chemistry or Biology question.
              Get a clear, step-by-step solution instantly — completely free.
            </p>

            {/* Arrow pointing down to demo */}
            <motion.div
              className="flex justify-center text-white/20 text-2xl"
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
              ↓
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── LIVE DEMO — the hero feature ────────────────────────────────── */}
      <section id="demo" className="pb-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}>
          <DemoSolver />
        </motion.div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-panel/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">How it works</h2>
          <p className="text-white/40 font-mono text-sm mb-14">Three steps from stuck to understood</p>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ icon, title, desc }, i) => (
              <motion.div key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                viewport={{ once: true }}>
                <div className="w-14 h-14 rounded-2xl bg-violet/10 border border-violet/20
                                flex items-center justify-center text-2xl mx-auto mb-4">
                  {icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-white/45 font-mono leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Subjects ────────────────────────────────────────────────────── */}
      <section id="subjects" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              Every STEM subject covered
            </h2>
            <p className="text-white/40 font-mono text-sm">
              From Class 9 basics to JEE Advanced level
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {SUBJECTS.map((sub, i) => (
              <motion.div key={sub.name}
                className="bg-panel border border-white/[0.07] rounded-xl p-5
                           hover:border-white/15 transition-all group cursor-default"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}>
                <div className="text-3xl mb-3">{sub.icon}</div>
                <h3 className="text-base font-bold mb-3"
                  style={{ color: sub.color }}>
                  {sub.name}
                </h3>
                <ul className="space-y-1.5">
                  {sub.examples.map(ex => (
                    <li key={ex} className="text-xs text-white/40 font-mono flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: sub.color }} />
                      {ex}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing — simple, transparent ───────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 bg-panel/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              Start free, upgrade when you need more
            </h2>
            <p className="text-white/40 font-mono text-sm">
              No credit card. No tricks. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Free plan */}
            <motion.div
              className="bg-panel border border-white/[0.08] rounded-2xl p-7"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}>
              <div className="text-sm font-mono text-white/40 mb-2">FREE FOREVER</div>
              <div className="text-4xl font-extrabold mb-1">$0</div>
              <div className="text-white/30 font-mono text-xs mb-6">No card needed</div>
              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <span className="text-acid text-xs">✓</span>
                    <span className="text-white/60 font-mono">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register"
                className="block text-center bg-white/5 border border-white/10 text-white/70
                           font-bold py-3 rounded-xl text-sm hover:bg-white/8 transition-all">
                Get started free →
              </Link>
            </motion.div>

            {/* Paid plan */}
            <motion.div
              className="bg-panel border border-violet/40 rounded-2xl p-7 relative
                         shadow-[0_0_60px_rgba(199,125,255,0.12)]"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}>
              <div className="absolute -top-3 left-6 bg-violet text-white text-xs
                              font-bold font-mono px-4 py-1 rounded-full">
                MOST POPULAR
              </div>
              <div className="text-sm font-mono text-violet mb-2">BASIC PLAN</div>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-4xl font-extrabold">$9</span>
                <span className="text-white/30 font-mono text-sm mb-1">/month</span>
              </div>
              <div className="text-white/30 font-mono text-xs mb-6">
                or $79/year — save 30%
              </div>
              <ul className="space-y-3 mb-8">
                {PAID_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <span className="text-violet text-xs">✓</span>
                    <span className="text-white/60 font-mono">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?plan=basic"
                className="block text-center bg-violet text-white font-bold py-3 rounded-xl
                           text-sm hover:bg-violet/90 transition-all
                           hover:shadow-[0_0_30px_rgba(199,125,255,0.4)]">
                Start 7-day free trial →
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}>
            <h2 className="text-4xl font-extrabold tracking-tight mb-5">
              Ready to actually understand<br />
              <span className="gradient-text">your subjects?</span>
            </h2>
            <p className="text-white/40 font-mono text-sm mb-8">
              Join students already using Solvr to get unstuck.
              Start free — no card, no commitment.
            </p>
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 bg-violet text-white font-bold
                         px-10 py-4 rounded-xl text-base hover:bg-violet/90 transition-all
                         hover:shadow-[0_0_50px_rgba(199,125,255,0.45)]">
              Create free account →
            </Link>
            <p className="text-xs text-white/20 font-mono mt-4">
              5 free problems every month · No credit card · Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center
                        justify-between gap-4 text-xs text-white/25 font-mono">
          <div className="flex items-center gap-2">
            <span>🔬</span>
            <span className="text-white/40 font-bold">Solvr AI</span>
            <span>— Built for students, by students</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth/login"   className="hover:text-white/50 transition-colors">Sign in</Link>
            <Link href="/auth/register"className="hover:text-white/50 transition-colors">Sign up free</Link>
            <span>© 2025 Solvr AI</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
