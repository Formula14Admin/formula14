'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const FIELD = 'mb-1.5 block text-sm font-medium text-gray-400'
const INPUT = 'w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]'
const INPUT_STYLE = { backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)' }

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }

    setLoading(true)
    // Resend + password update integration pending
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setDone(true)
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="flex w-full max-w-sm flex-col items-center">
        <Image
          src="/Updated Primary Logo.png"
          alt="Formula14"
          width={0}
          height={0}
          sizes="280px"
          style={{ width: '280px', height: 'auto', marginBottom: '28px' }}
          priority
        />

        {done ? (
          <div className="w-full space-y-4 text-center">
            <div className="rounded-lg px-4 py-4 text-sm text-green-300" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              Your password has been reset. You can now log in with your new password.
            </div>
            <Link
              href="/login"
              className="block w-full rounded-lg py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#6BA3D6' }}
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <h2 className="mb-4 text-lg font-bold text-white">Set a new password</h2>
            </div>
            <div>
              <label className={FIELD}>New Password <span className="text-gray-600">(min. 8 characters)</span></label>
              <input
                type="password" required minLength={8}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={INPUT} style={INPUT_STYLE}
              />
            </div>
            <div>
              <label className={FIELD}>Confirm New Password</label>
              <input
                type="password" required
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={INPUT} style={INPUT_STYLE}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#6BA3D6' }}
            >
              {loading ? 'Saving…' : 'Reset Password'}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-gray-500 hover:text-gray-300">← Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
