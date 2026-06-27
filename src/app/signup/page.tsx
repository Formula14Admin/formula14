'use client'

import Image from 'next/image'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FIELD = 'mb-1.5 block text-sm font-medium text-gray-400'
const INPUT = 'w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]'
const INPUT_STYLE = { backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)' }

export default function SignupPage() {
  const router = useRouter()

  const [firstName,     setFirstName]     = useState('')
  const [lastName,      setLastName]      = useState('')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [confirmPass,   setConfirmPass]   = useState('')
  const [dob,           setDob]           = useState('')
  const [phone,         setPhone]         = useState('')
  const [registeringAs, setRegisteringAs] = useState<'athlete' | 'parent'>('athlete')
  const [athleteName,   setAthleteName]   = useState('')

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPass) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { data, error: rpcError } = await supabase.rpc('register_user', {
        p_email:          email.trim().toLowerCase(),
        p_password:       password,
        p_first_name:     firstName.trim(),
        p_last_name:      lastName.trim(),
        p_phone:          phone.trim() || null,
        p_dob:            dob || null,
        p_registering_as: registeringAs,
        p_athlete_name:   registeringAs === 'parent' ? athleteName.trim() : null,
      })

      if (rpcError) {
        if (rpcError.message?.includes('EMAIL_EXISTS')) {
          setError('An account with this email already exists. Try logging in.')
        } else {
          setError('Registration failed. Please try again.')
          console.error('[signup] rpc error:', rpcError)
        }
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setError('Registration failed. Please try again.')
        setLoading(false)
        return
      }

      // Auto-login
      const result = await signIn('credentials', {
        email:    email.trim().toLowerCase(),
        password: password,
        redirect: false,
      })

      if (result?.error) {
        // Account created but auto-login failed — send to login
        router.replace('/login')
        return
      }

      // Store welcome message for dashboard to display
      try {
        localStorage.setItem('f14_welcome_msg', `Welcome to Formula14, ${firstName.trim()}! Your account has been created.`)
      } catch {}

      router.replace('/athlete/dashboard')
    } catch (err) {
      console.error('[signup] error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
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

        <form onSubmit={handleSubmit} className="w-full space-y-4">

          {/* Name row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={FIELD}>First Name</label>
              <input
                type="text" required
                value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="First"
                className={INPUT} style={INPUT_STYLE}
              />
            </div>
            <div className="flex-1">
              <label className={FIELD}>Last Name</label>
              <input
                type="text" required
                value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Last"
                className={INPUT} style={INPUT_STYLE}
              />
            </div>
          </div>

          <div>
            <label className={FIELD}>Email</label>
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              className={INPUT} style={INPUT_STYLE}
            />
          </div>

          <div>
            <label className={FIELD}>Password <span className="text-gray-600">(min. 8 characters)</span></label>
            <input
              type="password" required minLength={8}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={INPUT} style={INPUT_STYLE}
            />
          </div>

          <div>
            <label className={FIELD}>Confirm Password</label>
            <input
              type="password" required
              value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={INPUT} style={INPUT_STYLE}
            />
          </div>

          <div>
            <label className={FIELD}>Date of Birth</label>
            <input
              type="date"
              value={dob} onChange={e => setDob(e.target.value)}
              className={INPUT} style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label className={FIELD}>Phone <span className="text-gray-600">(optional)</span></label>
            <input
              type="tel"
              value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="04xx xxx xxx"
              className={INPUT} style={INPUT_STYLE}
            />
          </div>

          {/* Registering as toggle */}
          <div>
            <label className={FIELD}>I am registering as a</label>
            <div className="mt-1 flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['athlete', 'parent'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setRegisteringAs(opt)}
                  className="flex-1 py-2.5 text-sm font-semibold transition"
                  style={{
                    backgroundColor: registeringAs === opt ? '#6BA3D6' : '#2a2a2a',
                    color: registeringAs === opt ? '#fff' : '#9ca3af',
                  }}
                >
                  {opt === 'athlete' ? 'Athlete' : 'Parent / Guardian'}
                </button>
              ))}
            </div>
          </div>

          {registeringAs === 'parent' && (
            <div>
              <label className={FIELD}>Athlete&apos;s Name</label>
              <input
                type="text" required={registeringAs === 'parent'}
                value={athleteName} onChange={e => setAthleteName(e.target.value)}
                placeholder="Your child's full name"
                className={INPUT} style={INPUT_STYLE}
              />
              <p className="mt-1 text-xs text-gray-600">You can add more details about your athlete after registration.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#6BA3D6' }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#6BA3D6] hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
