import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (uses anon key; authenticate_user is SECURITY DEFINER)
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL
    || 'https://dydrtbrhhgyppancbhpy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZHJ0YnJoaGd5cHBhbmNiaHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MjQzODIsImV4cCI6MjA5ODEwMDM4Mn0.46LZMlaoN_ts2Dsur9ma2lBsMLMaC0wvhN7njrRlcGc'
)

// Fallback users for development before migrations are run
const FALLBACK_USERS = [
  { id: '1', name: 'Matt', email: 'matt@formula14.com.au', password: 'Formula14Matt!', role: 'director' },
  { id: '2', name: 'Jade', email: 'jade@formula14.com.au', password: 'Formula14Jade!', role: 'director' },
]

// Use secure cookies whenever we're in production, regardless of NEXTAUTH_URL.
// This ensures iOS Safari and Android Chrome correctly handle cookies on HTTPS.
const secure = process.env.NODE_ENV === 'production'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Try Supabase first (authenticate_user RPC uses bcrypt via pgcrypto)
        try {
          const { data, error } = await supabaseAuth.rpc('authenticate_user', {
            p_email:    credentials.email,
            p_password: credentials.password,
          })
          if (!error && data && data.length > 0) {
            const u = data[0]
            return {
              id:                  u.id,
              name:                `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
              email:               u.email,
              role:                u.role,
              mustChangePassword:  u.must_change_password ?? false,
            }
          }
        } catch {
          // Supabase unavailable — fall through to local fallback
        }

        // Fallback: hardcoded users (used before migrations are run)
        const fallback = FALLBACK_USERS.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        )
        if (fallback) {
          return { id: fallback.id, name: fallback.name, email: fallback.email, role: fallback.role }
        }

        return null
      },
    }),
  ],

  pages: { signIn: '/login' },

  session: {
    strategy: 'jwt',
    // 30 days — prevents unexpected logouts on mobile where browsers
    // may not preserve sessions as long as desktop browsers do
    maxAge: 30 * 24 * 60 * 60,
  },

  jwt: {
    // JWT lifetime matches session maxAge
    maxAge: 30 * 24 * 60 * 60,
  },

  // Explicit cookie configuration.
  //
  // sameSite: 'lax'  — required for mobile browsers; 'strict' blocks cookies
  //                     on top-level navigation from external links/apps
  // secure: true      — required in production (HTTPS); false for localhost dev
  // httpOnly: true    — prevents JS access, keeps cookies safe
  //
  // Multiple concurrent sessions are supported by default with JWT strategy —
  // each device stores its own independent token in its own cookie.
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure,
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure,
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id                 = user.id
        token.name               = user.name
        token.role               = user.role
        token.mustChangePassword = user.mustChangePassword
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id                 = token.sub ?? token.id
        session.user.name               = token.name as string
        session.user.role               = token.role
        session.user.mustChangePassword = token.mustChangePassword
      }
      return session
    },
  },
}
