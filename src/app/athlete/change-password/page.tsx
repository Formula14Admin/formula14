'use client'

import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const ACCENT = '#6BA3D6'
const INPUT_CLS  = 'w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]'
const INPUT_STYLE = { backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)' }

export default function ChangePasswordPage() {
  const { data: session } = useSession()
  const router            = useRouter()
  const email             = session?.user?.email ?? ''
  const firstName         = (session?.user?.name ?? '').split(' ')[0] || 'there'

  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (next.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (next !== confirm)  { setError('Passwords do not match.'); return }
    setLoading(true)

    const res  = await fetch('/api/athletes/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, currentPassword: current, newPassword: next }),
    })
    const data = await res.json() as { success?: boolean; error?: string }

    if (!res.ok || data.error) {
      setError(data.error ?? 'Something went wrong — please try again.')
      setLoading(false)
      return
    }

    setDone(true)

    // Refresh session: sign out then sign in with the new password
    await signOut({ redirect: false })
    const result = await signIn('credentials', { email, password: next, redirect: false })

    if (result?.ok) {
      router.replace('/athlete/dashboard')
    } else {
      // Fallback — session token doesn't carry mustChangePassword anymore after re-login
      router.replace('/login?message=password-changed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${ACCENT}25` }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Formula14!</h1>
          <p className="mt-2 text-sm text-gray-400">
            Hi {firstName}! Please set a new password to activate your account.
          </p>
        </div>

        {done ? (
          <div className="rounded-xl px-5 py-4 text-center text-sm text-green-300"
            style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
            Password updated. Signing you in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">
                Temporary Password
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Use the temporary password from your invitation email.
              </p>
              <input
                type="password"
                required
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="Your temporary password"
                autoComplete="current-password"
                className={INPUT_CLS}
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className={INPUT_CLS}
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className={INPUT_CLS}
                style={INPUT_STYLE}
              />
              {next && confirm && next !== confirm && (
                <p className="mt-1.5 text-xs text-red-400">Passwords do not match.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !current || !next || !confirm}
              className="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {loading ? 'Updating password…' : 'Set My Password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-600">
          Need help?{' '}
          <a href="mailto:admin@formula14.com.au" className="text-gray-400 hover:text-gray-300">
            admin@formula14.com.au
          </a>
        </p>
      </div>
    </div>
  )
}
