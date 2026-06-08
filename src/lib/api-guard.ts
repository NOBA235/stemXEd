// ============================================================
//  API Guard — wraps every protected route with:
//   1. Supabase session verification
//   2. Plan limit enforcement
//   3. Per-user rate limiting
//   4. Standardised error responses
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { rateLimit, API_RATE_LIMITS } from '@/lib/rate-limit'
import { getPlanLimits } from '@/lib/stripe/plans'
import type { Profile } from '@/types'
import { NextResponse } from 'next/server'

export interface GuardResult {
  user: { id: string; email: string }
  profile: Profile
}

type GuardFeature = 'imageUpload' | 'pdfUpload' | 'labAccess' | 'priorityProcessing' | 'exportPdf'

interface GuardOptions {
  /** If set, check that this feature is available on the user's plan */
  requireFeature?: GuardFeature
  /** If true, check the monthly problem quota and increment it on success */
  checkProblemQuota?: boolean
}

export async function apiGuard(opts: GuardOptions = {}): Promise<GuardResult | NextResponse> {
  const supabase = await createClient()

  // ── 1. Verify session ─────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── 2. Fetch profile (plan, usage) ────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // ── 3. Rate limiting (per user per plan tier) ─────────────────────────────
  const rateCfg = API_RATE_LIMITS[profile.plan] ?? API_RATE_LIMITS.free
  const rl = rateLimit(`api:${user.id}`, rateCfg)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Slow down.', retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.retryAfterSec),
          'X-RateLimit-Limit': String(rateCfg.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
        },
      }
    )
  }

  const limits = getPlanLimits(profile.plan)

  // ── 4. Feature gate ───────────────────────────────────────────────────────
  if (opts.requireFeature) {
    const allowed = limits[opts.requireFeature]
    if (!allowed) {
      return NextResponse.json(
        { error: `Your ${profile.plan} plan does not include ${opts.requireFeature}. Please upgrade.`, upgrade: true },
        { status: 403 }
      )
    }
  }

  // ── 5. Monthly quota check ────────────────────────────────────────────────
  if (opts.checkProblemQuota) {
    // Reset usage if we've rolled into a new calendar month
    const resetAt = new Date(profile.usage_reset_at)
    const now = new Date()
    if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
      await supabase
        .from('profiles')
        .update({ problems_used: 0, usage_reset_at: now.toISOString() })
        .eq('id', user.id)
      profile.problems_used = 0
    }

    const quota = limits.problemsPerMonth
    if (quota !== -1 && profile.problems_used >= quota) {
      return NextResponse.json(
        {
          error: `You've used all ${quota} problems for this month. Upgrade to continue.`,
          upgrade: true,
          quota,
          used: profile.problems_used,
        },
        { status: 402 }
      )
    }
  }

  return { user: { id: user.id, email: user.email! }, profile }
}

// ── Standard error response builder ──────────────────────────────────────────
export function apiError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}
