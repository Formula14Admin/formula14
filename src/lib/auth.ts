import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const USERS = [
  { id: '1', name: 'Matt', email: 'matt@formula14.com.au', password: 'Formula14Matt!' },
  { id: '2', name: 'Jade', email: 'jade@formula14.com.au', password: 'Formula14Jade!' },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
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
  session: { strategy: 'jwt' },
}
