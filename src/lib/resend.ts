import { Resend } from 'resend'

// Never import this in client components — server-only (API routes, Server Actions)
export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

export const REPLY_TO = 'admin@formula14.com.au'
