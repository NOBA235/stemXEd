// ============================================================
//  Rate Limiter — Sliding window algorithm
//  Works in Edge runtime (no Node APIs)
//  For production at scale: replace Map with Upstash Redis
// ============================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (per-instance; fine for single-server / serverless cold starts)
// For multi-instance: swap for Upstash Redis with @upstash/ratelimit
const store = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in seconds */
  windowSec: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number     // Unix ms timestamp
  retryAfterSec?: number
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSec * 1000

  // Clean expired entries periodically (every ~1000 calls)
  if (Math.random() < 0.001) {
    for (const [k, v] of Array.from(store.entries())) {
      if (v.resetAt < now) store.delete(k)
    }
  }

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: config.limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

// ── Per-plan API rate limits (per minute) ────────────────────────────────────
export const API_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free:    { limit: 5,  windowSec: 60 },   // 5 req/min
  basic:   { limit: 20, windowSec: 60 },   // 20 req/min
  premium: { limit: 60, windowSec: 60 },   // 60 req/min
}

// ── Auth endpoint rate limit (prevents brute force) ─────────────────────────
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 10,        // 10 attempts
  windowSec: 900,   // per 15 minutes per IP
}

// ── File upload rate limit ───────────────────────────────────────────────────
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowSec: 3600,  // 30 uploads per hour per user
}
