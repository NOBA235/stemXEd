// ============================================================
//  GET /api/cron/reset-usage
//  Resets monthly problem usage for all users.
//  Run via Vercel Cron (vercel.json) on the 1st of each month.
//
//  Security: protected by CRON_SECRET env var
//  Add to vercel.json:
//  { "crons": [{ "path": "/api/cron/reset-usage", "schedule": "0 0 1 * *" }] }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Verify this is called by the cron scheduler, not a random visitor
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()

  try {
    // Reset usage for all users whose reset_at is in a previous month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { error, count } = await supabase
      .from('profiles')
      .update({
        problems_used:   0,
        experiments_run: 0,
        usage_reset_at:  startOfMonth,
        updated_at:      now.toISOString(),
      })
      .lt('usage_reset_at', startOfMonth)

    if (error) throw error

    console.log(`[cron/reset-usage] Reset ${count} users at ${now.toISOString()}`)
    return NextResponse.json({ success: true, usersReset: count, resetAt: startOfMonth })
  } catch (err) {
    console.error('[cron/reset-usage]', err)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
