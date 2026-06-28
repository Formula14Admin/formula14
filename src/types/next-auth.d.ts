import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role?:               string
    mustChangePassword?: boolean
  }
  interface Session {
    user: DefaultSession['user'] & {
      id?:                 string
      role?:               string
      mustChangePassword?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?:                 string
    role?:               string
    mustChangePassword?: boolean
  }
}
