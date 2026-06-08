import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit'

const AUTH_ONLY  = ['/auth/login', '/auth/register']
const PAID_PATHS = ['/dashboard/lab']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // 1. Brute-force protection on auth routes
  if (AUTH_ONLY.some(p => pathname.startsWith(p))) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = rateLimit(`auth-ip:${ip}`, AUTH_RATE_LIMIT)
    if (!rl.success) {
      return new NextResponse('Too many attempts. Try again later.', {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSec ?? 900), 'Content-Type': 'text/plain' },
      })
    }
  }

  // 2. Supabase session refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getUser() — cryptographically verified, never getSession() in middleware
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Redirect authenticated users away from auth pages
  if (user && AUTH_ONLY.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 4. Protect /dashboard routes
  if (!user && pathname.startsWith('/dashboard')) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // 5. Protect /api routes (webhooks use Stripe signature auth instead)
  if (!user && pathname.startsWith('/api/') && !pathname.startsWith('/api/webhooks') && !pathname.startsWith('/api/cron')) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // 6. Plan gate — lab requires paid plan
  if (user && PAID_PATHS.some(p => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from('profiles').select('plan').eq('id', user.id).single()
    if (!profile || profile.plan === 'free') {
      const url = new URL('/pricing', request.url)
      url.searchParams.set('reason', 'lab')
      return NextResponse.redirect(url)
    }
  }

  // 7. No-cache for private routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  }

  response.headers.delete('X-Powered-By')
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
