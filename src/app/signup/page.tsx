'use client'

import Image from 'next/image'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DatePicker } from '@/components/ui/Pickers'

const FIELD = 'mb-1.5 block text-sm font-medium text-gray-400'
const INPUT = 'w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]'
const INPUT_STYLE = { backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)' }
const SECTION_HEAD = 'mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-500'

function computeAge(dob: string): number | null {
  if (!dob) return null
  const born  = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return isNaN(age) ? null : age
}

export default function SignupPage() {
  const router = useRouter()

  // Core fields
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [dob,         setDob]         = useState('')
  const [phone,       setPhone]       = useState('')

  // Emergency contact (18+)
  const [ecName,         setEcName]         = useState('')
  const [ecRelationship, setEcRelationship] = useState('')
  const [ecPhone,        setEcPhone]        = useState('')

  // Parent / guardian (under 18)
  const [guardianName,         setGuardianName]         = useState('')
  const [guardianRelationship, setGuardianRelationship] = useState('')
  const [guardianPhone,        setGuardianPhone]        = useState('')
  const [guardianEmail,        setGuardianEmail]        = useState('')

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const age       = useMemo(() => computeAge(dob), [dob])
  const isUnder18 = age !== null && age < 18
  const showContactSection = age !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPass) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('register_user', {
        p_email:          email.trim().toLowerCase(),
        p_password:       password,
        p_first_name:     firstName.trim(),
        p_last_name:      lastName.trim(),
        p_phone:          phone.trim() || null,
        p_dob:            dob || null,
        p_registering_as: 'athlete',
        p_athlete_name:   null,
      })

      if (rpcError) {
        console.error('[signup] rpc error:', rpcError)
        if (rpcError.message?.includes('EMAIL_EXISTS')) {
          setError('An account with this email already exists. Try logging in.')
        } else {
          const detail = rpcError.message || rpcError.code || JSON.stringify(rpcError)
          setError(`Registration failed: ${detail}`)
        }
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setError('Registration failed: the database returned no data. Please contact support.')
        setLoading(false)
        return
      }

      // Persist contact info locally — synced to Supabase in profile step
      try {
        const contactInfo = isUnder18
          ? { type: 'guardian',  name: guardianName, relationship: guardianRelationship, phone: guardianPhone, email: guardianEmail }
          : { type: 'emergency', name: ecName,        relationship: ecRelationship,       phone: ecPhone }
        localStorage.setItem('f14_contact_info', JSON.stringify(contactInfo))
      } catch {}

      const result = await signIn('credentials', {
        email:    email.trim().toLowerCase(),
        password: password,
        redirect: false,
      })

      if (result?.error) { router.replace('/login'); return }

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
    <div className="flex min-h-screen items-center justify-center px-4 py-10" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="flex w-full max-w-sm flex-col items-center">
        <Image
          src="/Updated Primary Logo.png"
          alt="Formula14"
          width={0} height={0} sizes="280px"
          style={{ width: '280px', height: 'auto', marginBottom: '28px' }}
          priority
        />

        <form onSubmit={handleSubmit} className="w-full space-y-4">

          {/* Name */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={FIELD}>First Name</label>
              <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div className="flex-1">
              <label className={FIELD}>Last Name</label>
              <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" className={INPUT} style={INPUT_STYLE} />
            </div>
          </div>

          <div>
            <label className={FIELD}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" className={INPUT} style={INPUT_STYLE} />
          </div>

          <div>
            <label className={FIELD}>Password <span className="text-gray-600">(min. 8 characters)</span></label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={INPUT} style={INPUT_STYLE} />
          </div>

          <div>
            <label className={FIELD}>Confirm Password</label>
            <input type="password" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={INPUT} style={INPUT_STYLE} />
          </div>

          <div>
            <label className={FIELD}>Date of Birth</label>
            <DatePicker
              value={dob}
              onChange={setDob}
              dark
              maxDate={new Date().toISOString().slice(0, 10)}
            />
            {age !== null && (
              <p className="mt-1 text-xs" style={{ color: isUnder18 ? '#fb923c' : '#6b7280' }}>
                {isUnder18
                  ? `Age ${age} — parent or guardian details required below`
                  : `Age ${age}`}
              </p>
            )}
          </div>

          <div>
            <label className={FIELD}>Phone <span className="text-gray-600">(optional)</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="04xx xxx xxx" className={INPUT} style={INPUT_STYLE} />
          </div>

          {/* Contact section — appears once DOB is entered */}
          {showContactSection && (
            <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.09)' }}>
              {isUnder18 ? (
                <>
                  <p className={SECTION_HEAD}>Parent / Guardian</p>
                  <div>
                    <label className={FIELD}>Full Name <span className="text-red-400">*</span></label>
                    <input type="text" required value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Parent or guardian's full name" className={INPUT} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label className={FIELD}>Relationship <span className="text-red-400">*</span></label>
                    <input type="text" required value={guardianRelationship} onChange={e => setGuardianRelationship(e.target.value)} placeholder="e.g. Mother, Father, Guardian" className={INPUT} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label className={FIELD}>Phone <span className="text-red-400">*</span></label>
                    <input type="tel" required value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} placeholder="04xx xxx xxx" className={INPUT} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label className={FIELD}>Email <span className="text-gray-600">(optional)</span></label>
                    <input type="email" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} placeholder="parent@email.com" className={INPUT} style={INPUT_STYLE} />
                  </div>
                </>
              ) : (
                <>
                  <p className={SECTION_HEAD}>Emergency Contact</p>
                  <div>
                    <label className={FIELD}>Full Name <span className="text-red-400">*</span></label>
                    <input type="text" required value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Emergency contact's full name" className={INPUT} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label className={FIELD}>Relationship <span className="text-red-400">*</span></label>
                    <input type="text" required value={ecRelationship} onChange={e => setEcRelationship(e.target.value)} placeholder="e.g. Parent, Spouse, Sibling" className={INPUT} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label className={FIELD}>Phone <span className="text-red-400">*</span></label>
                    <input type="tel" required value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="04xx xxx xxx" className={INPUT} style={INPUT_STYLE} />
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !showContactSection}
            className="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#6BA3D6' }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#6BA3D6] hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
