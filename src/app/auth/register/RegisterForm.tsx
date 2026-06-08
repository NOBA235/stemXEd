'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export default function RegisterForm() {
  const router = useRouter()
  const params  = useSearchParams()
  const plan    = params.get('plan')
  const billing = params.get('billing') || 'monthly'

  const [form, setForm]     = useState({ email: '', password: '', username: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [demoQ, setDemoQ] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const q = sessionStorage.getItem('solvr_demo_q')
    if (q) { setDemoQ(q); sessionStorage.removeItem('solvr_demo_q') }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError(''); setLoading(true)
    const { error, data } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { username: form.username, full_name: form.username } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (plan && data.user) {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing }),
      })
      const { url } = await res.json()
      if (url) { window.location.href = url; return }
    }
    router.push('/dashboard'); router.refresh()
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback${plan ? `?plan=${plan}&billing=${billing}` : ''}` },
    })
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-grid-dim bg-grid opacity-100 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div className="w-full max-w-md relative z-10 bg-panel border border-white/[0.08] rounded-2xl p-8 shadow-2xl"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>

        <div className="flex items-center gap-2.5 mb-8">
          <span className="text-2xl">🔬</span>
          <div>
            <div className="text-base font-extrabold text-violet">Solvr AI</div>
            <div className="text-xs text-white/30 font-mono">Start learning smarter</div>
          </div>
        </div>

        {plan && (
          <div className="bg-violet/10 border border-violet/25 rounded-lg px-4 py-2.5 text-xs font-mono text-violet mb-6">
            🎉 Signing up for the <strong>{plan}</strong> plan
          </div>
        )}

        {demoQ && (
          <div className="bg-surface border border-white/[0.08] rounded-xl px-4 py-3 mb-5">
            <p className="text-[10px] font-mono text-white/30 mb-1">YOUR QUESTION IS WAITING</p>
            <p className="text-sm text-white/70 font-mono">"{demoQ}"</p>
            <p className="text-[10px] font-mono text-acid mt-1">
              ✓ Sign up and we'll solve it instantly
            </p>
          </div>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Create your account</h1>
        <p className="text-sm text-white/40 font-mono mb-7">5 free problems/month · No card needed</p>

        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-xl py-3 text-sm font-semibold hover:bg-white/8 transition-all mb-5">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-xs text-white/30 font-mono">or email</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {error && (
          <motion.div className="bg-danger/10 border border-danger/30 text-danger text-sm font-mono px-4 py-3 rounded-lg mb-5"
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            ⚠ {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'username', type: 'text',     label: 'USERNAME', placeholder: 'sciencestudent' },
            { key: 'email',    type: 'email',    label: 'EMAIL',    placeholder: 'you@example.com' },
            { key: 'password', type: 'password', label: 'PASSWORD', placeholder: '6+ characters' },
          ].map(({ key, type, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] font-mono tracking-widest text-white/30 mb-1.5">{label}</label>
              <input type={type} value={(form as Record<string,string>)[key]} placeholder={placeholder} required
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-surface border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-violet/50 transition-colors" />
            </div>
          ))}
          <motion.button type="submit" disabled={loading}
            className="w-full bg-violet text-white font-bold py-3 rounded-xl text-sm hover:bg-violet/90 transition-all disabled:opacity-50 mt-2"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            {loading ? 'Creating account...' : 'Create account →'}
          </motion.button>
        </form>

        <p className="text-center text-xs text-white/25 font-mono mt-4">
          By signing up you agree to our Terms &amp; Privacy Policy
        </p>
        <p className="text-center text-sm text-white/30 font-mono mt-3">
          Have an account?{' '}
          <Link href="/auth/login" className="text-violet font-semibold hover:text-violet/80">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
