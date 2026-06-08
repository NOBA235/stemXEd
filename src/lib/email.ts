// ============================================================
//  Email via Resend
//  All emails are fire-and-forget (non-blocking)
//  Never throw — log and continue if email fails
// ============================================================

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@solvr.ai'
const RESEND_API_KEY = process.env.RESEND_API_KEY

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', to)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: `Solvr AI <${FROM}>`, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[email] Resend error:', err)
    }
  } catch (err) {
    console.error('[email] Failed to send:', err)
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

const base = (body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #050508; color: #e0e0e0; margin: 0; padding: 0; }
  .wrap { max-width: 560px; margin: 40px auto; padding: 32px; background: #0f0f1a; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); }
  .logo { font-size: 22px; font-weight: 800; color: #c77dff; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  p { font-size: 14px; color: #aaa; line-height: 1.7; margin: 0 0 14px; }
  .btn { display: inline-block; background: #c77dff; color: #000 !important; font-weight: 700; padding: 12px 28px; border-radius: 10px; text-decoration: none; margin: 8px 0 16px; font-size: 14px; }
  .badge { display: inline-block; background: rgba(57,255,143,0.12); border: 1px solid rgba(57,255,143,0.3); color: #39ff8f; font-family: monospace; font-size: 12px; padding: 4px 10px; border-radius: 6px; }
  .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #555; }
</style></head>
<body><div class="wrap">${body}</div></body>
</html>`

// Welcome email after signup
export async function sendWelcomeEmail(to: string, username: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://solvr.ai'
  await send(
    to,
    'Welcome to Solvr AI 🔬',
    base(`
      <div class="logo">🔬 Solvr AI</div>
      <h1>Welcome, ${username}!</h1>
      <p>You're in. Start solving any Physics, Maths, Chemistry or Biology problem instantly — just type or upload a photo.</p>
      <a href="${appUrl}/dashboard/solve" class="btn">Solve your first problem →</a>
      <p>Your free plan includes <span class="badge">5 problems/month</span>. Upgrade anytime for unlimited access.</p>
      <div class="footer">
        <p>You're receiving this because you signed up at solvr.ai. Questions? Reply to this email.</p>
      </div>
    `)
  )
}

// 80% usage warning
export async function sendUsageWarningEmail(to: string, username: string, used: number, limit: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://solvr.ai'
  await send(
    to,
    `You've used ${used}/${limit} problems this month`,
    base(`
      <div class="logo">🔬 Solvr AI</div>
      <h1>Running low on problems</h1>
      <p>Hi ${username}, you've used <strong>${used} of ${limit}</strong> problems this month. You have ${limit - used} remaining.</p>
      <p>Upgrade to Basic or Premium to keep solving without interruption.</p>
      <a href="${appUrl}/pricing" class="btn">Upgrade now →</a>
      <div class="footer"><p>Your usage resets on the 1st of each month.</p></div>
    `)
  )
}

// Subscription confirmation
export async function sendSubscriptionConfirmEmail(
  to: string, username: string, plan: string, nextBillingDate: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://solvr.ai'
  await send(
    to,
    `You're now on Solvr ${plan} ✓`,
    base(`
      <div class="logo">🔬 Solvr AI</div>
      <h1>Subscription confirmed 🎉</h1>
      <p>Hi ${username}, you're now on the <span class="badge">${plan}</span> plan. All features are unlocked.</p>
      <a href="${appUrl}/dashboard" class="btn">Go to your dashboard →</a>
      <p style="font-size:12px;color:#666">Next billing date: ${nextBillingDate}. Manage your subscription anytime in Settings.</p>
      <div class="footer"><p>Questions about billing? Reply to this email.</p></div>
    `)
  )
}

// Cancellation confirmation
export async function sendCancellationEmail(to: string, username: string, accessUntil: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://solvr.ai'
  await send(
    to,
    'Your Solvr subscription has been cancelled',
    base(`
      <div class="logo">🔬 Solvr AI</div>
      <h1>Subscription cancelled</h1>
      <p>Hi ${username}, your subscription has been cancelled as requested.</p>
      <p>You'll retain full access until <strong>${accessUntil}</strong>, after which your account moves to the free plan.</p>
      <a href="${appUrl}/pricing" class="btn">Resubscribe anytime →</a>
      <div class="footer"><p>We're sorry to see you go. If you cancelled by mistake, you can resubscribe above.</p></div>
    `)
  )
}
