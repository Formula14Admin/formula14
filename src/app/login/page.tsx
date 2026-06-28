'use client'

import Image from 'next/image'
import Link from 'next/link'
import { signIn, getSession } from 'next-auth/react'
import { sendEmail } from '@/lib/send-email'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const INPUT_CLS = 'w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]'
const INPUT_STYLE = { backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)' }

function roleToPath(role?: string | null) {
  if (role === 'director')    return '/dashboard'
  if (role === 'coach')       return '/coach/dashboard'
  if (role === 'coach_member') return '/coach-member/dashboard'
  return '/athlete/dashboard'
}

function LoginForm() {
  const router     = useRouter()
  const params     = useSearchParams()
  const [error,    setError]   = useState('')
  const [loading,  setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent,  setForgotSent]  = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email:    form.get('email') as string,
      password: form.get('password') as string,
      redirect: false,
    })

    if (result?.error) {
      setLoading(false)
      setError('Invalid email or password.')
      return
    }

    // Get fresh session to read role for redirect
    const session = await getSession()
    const role    = session?.user?.role

    // Honour explicit callbackUrl only for admin roles (prevents athlete bypass)
    const cb = params.get('callbackUrl')
    const dest = (cb && (role === 'director' || role === 'coach')) ? cb : roleToPath(role)
    router.replace(dest)
  }

  async function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setForgotLoading(true)
    const resetToken = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(forgotEmail)}`
    await sendEmail({
      template: 'password-reset',
      to: forgotEmail,
      data: { email: forgotEmail, resetUrl, expiresIn: '1 hour' },
    }).catch(console.error)
    setForgotLoading(false)
    setForgotSent(true)
  }

  if (forgotOpen) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Reset your password</h2>
          <p className="mt-1 text-sm text-gray-400">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        {forgotSent ? (
          <div className="rounded-lg px-4 py-3 text-sm text-green-300" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
            Reset email sent! Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Email</label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="you@formula14.com.au"
                className={INPUT_CLS}
                style={INPUT_STYLE}
              />
            </div>
            <button
              type="submit"
              disabled={forgotLoading}
              className="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#6BA3D6' }}
            >
              {forgotLoading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <button
          onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotEmail('') }}
          className="text-sm text-gray-500 hover:text-gray-300"
        >
          ← Back to sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-400">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@formula14.com.au"
          className={INPUT_CLS}
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-400">Password</label>
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-xs text-gray-500 hover:text-[#6BA3D6]"
          >
            Forgot your password?
          </button>
        </div>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={INPUT_CLS}
          style={INPUT_STYLE}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: '#6BA3D6' }}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-[#6BA3D6] hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="flex flex-col items-center">
        <Image
          src="/Updated Primary Logo.png"
          alt="Formula14"
          width={0}
          height={0}
          sizes="320px"
          style={{ width: '320px', height: 'auto', marginBottom: '32px' }}
          priority
        />
        <div className="w-80">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
