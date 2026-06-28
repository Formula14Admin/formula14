import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS    = ['/', '/login', '/signup', '/reset-password']
const PUBLIC_PREFIXES = ['/join/']

function roleToHome(role?: string | null): string {
  if (role === 'director')     return '/dashboard'
  if (role === 'coach')        return '/coach/dashboard'
  if (role === 'coach_member') return '/coach-member/dashboard'
  return '/athlete/dashboard'
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: 'next-auth.session-token',
  })

  // Unauthenticated — redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role           = token.role as string | undefined
  const isAthleteRoute = pathname.startsWith('/athlete')
  const isCoachRoute   = pathname.startsWith('/coach')

  // Athletes/parents: ONLY /athlete/* routes
  if (role === 'athlete') {
    const mustChangePassword = token.mustChangePassword as boolean | undefined
    if (mustChangePassword && pathname !== '/athlete/change-password') {
      return NextResponse.redirect(new URL('/athlete/change-password', request.url))
    }
    if (!isAthleteRoute) {
      return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Coach members: only /coach/* routes
  if (role === 'coach_member') {
    if (!isCoachRoute) {
      return NextResponse.redirect(new URL('/coach-member/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Employed coaches: access hub + coach routes, not athlete-only routes
  if (role === 'coach') {
    if (isAthleteRoute) {
      return NextResponse.redirect(new URL(roleToHome(role), request.url))
    }
    return NextResponse.next()
  }

  // Directors: unrestricted access
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
}
