'use client'

import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// useSearchParams must be inside a Suspense boundary in Next.js App Router
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email: form.get('email') as string,
      password: form.get('password') as string,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password.')
      return
    }

    // Redirect to original destination or dashboard.
    // router.replace avoids leaving the login page in the history stack,
    // which matters on mobile where the back button behaviour can be confusing.
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
    router.replace(callbackUrl)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-400">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@formula14.com.au"
          className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]"
          style={{
            backgroundColor: '#2a2a2a',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-400">
          Password
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]"
          style={{
            backgroundColor: '#2a2a2a',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
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
