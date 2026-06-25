import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const USERS = [
  { id: '1', name: 'Matt',   email: 'matt@formula14.com.au',   password: 'Formula14Matt!', role: 'admin'   },
  { id: '2', name: 'Jade',   email: 'jade@formula14.com.au',   password: 'Formula14Jade!', role: 'admin'   },
  { id: '3', name: 'Jordan', email: 'jordan@formula14.com.au', password: 'Athlete123!',     role: 'athlete' },
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
        const user = USERS.find(
          (u) => u.email === credentials?.email && u.password === credentials?.password
        )
        return user ?? null
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
        token.id   = user.id
        token.name = user.name
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name as string
        session.user.role = token.role
      }
      return session
    },
  },
}
