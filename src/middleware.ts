import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no auth required
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/join/')
  ) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    // Use the same cookie name we configure in authOptions
    cookieName: 'next-auth.session-token',
  })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as string | undefined
  const isAthleteRoute = pathname.startsWith('/athlete')

  // Athletes attempting to access admin/hub routes → redirect to athlete dashboard
  if (role === 'athlete' && !isAthleteRoute) {
    return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run on all paths except NextAuth API, static assets, and images
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
