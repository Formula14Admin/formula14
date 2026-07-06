'use client'

import Image from 'next/image'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DatePicker } from '@/components/ui/Pickers'

const LABEL = 'mb-1.5 block text-sm font-medium text-gray-400'
const INPUT = 'w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]'
const BASE_STYLE  = { backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)' }
const ERR_STYLE   = { backgroundColor: '#2a2a2a', border: '1px solid rgba(239,68,68,0.55)' }
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

  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [dob,         setDob]         = useState('')
  const [phone,       setPhone]       = useState('')

  const [ecName,         setEcName]         = useState('')
  const [ecRelationship, setEcRelationship] = useState('')
  const [ecPhone,        setEcPhone]        = useState('')

  const [guardianName,         setGuardianName]         = useState('')
  const [guardianRelationship, setGuardianRelationship] = useState('')
  const [guardianPhone,        setGuardianPhone]        = useState('')
  const [guardianEmail,        setGuardianEmail]        = useState('')

  const [errs,        setErrs]        = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading,     setLoading]     = useState(false)

  const age            = useMemo(() => computeAge(dob), [dob])
  const isUnder18      = age !== null && age < 18
  const showContact    = age !== null

  function setErr(field: string, msg: string) {
    setErrs(prev => ({ ...prev, [field]: msg }))
  }
  function clearErr(field: string) {
    setErrs(prev => ({ ...prev, [field]: '' }))
  }

  function Err({ f }: { f: string }) {
    return errs[f] ? <p className="mt-1 text-xs text-red-400">{errs[f]}</p> : null
  }

  function inputStyle(field: string) {
    return errs[field] ? ERR_STYLE : BASE_STYLE
  }

  function validateAll(): boolean {
    const e: Record<string, string> = {}

    if (!firstName.trim()) e.firstName = 'First name is required.'
    if (!lastName.trim())  e.lastName  = 'Last name is required.'

    if (!email.trim()) {
      e.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      e.email = 'Please enter a valid email address.'
    }

    if (!password) {
      e.password = 'Password is required.'
    } else if (password.length < 8) {
      e.password = 'Password must be at least 8 characters.'
    }

    if (!confirmPass) {
      e.confirmPass = 'Please confirm your password.'
    } else if (confirmPass !== password) {
      e.confirmPass = 'Passwords do not match.'
    }

    if (showContact) {
      if (isUnder18) {
        if (!guardianName.trim())         e.guardianName         = 'Guardian name is required.'
        if (!guardianRelationship.trim()) e.guardianRelationship = 'Relationship is required.'
        if (!guardianPhone.trim())        e.guardianPhone        = 'Phone number is required.'
      } else {
        if (!ecName.trim())         e.ecName         = 'Emergency contact name is required.'
        if (!ecRelationship.trim()) e.ecRelationship = 'Relationship is required.'
        if (!ecPhone.trim())        e.ecPhone        = 'Phone number is required.'
      }
    }

    setErrs(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')

    if (!validateAll()) return

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
          setErr('email', 'An account with this email already exists. Try logging in.')
        } else {
          const detail = rpcError.message || rpcError.code || JSON.stringify(rpcError)
          setServerError(`Registration failed: ${detail}`)
        }
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setServerError('Registration failed: the database returned no data. Please contact support.')
        setLoading(false)
        return
      }

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
      setServerError('Something went wrong. Please try again.')
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

        <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>

          {/* Name */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={LABEL}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); clearErr('firstName') }}
                onBlur={e => { if (!e.target.value.trim()) setErr('firstName', 'First name is required.') }}
                placeholder="First"
                className={INPUT}
                style={inputStyle('firstName')}
              />
              <Err f="firstName" />
            </div>
            <div className="flex-1">
              <label className={LABEL}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => { setLastName(e.target.value); clearErr('lastName') }}
                onBlur={e => { if (!e.target.value.trim()) setErr('lastName', 'Last name is required.') }}
                placeholder="Last"
                className={INPUT}
                style={inputStyle('lastName')}
              />
              <Err f="lastName" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={LABEL}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clearErr('email') }}
              onBlur={e => {
                const v = e.target.value.trim()
                if (!v) setErr('email', 'Email is required.')
                else if (!/\S+@\S+\.\S+/.test(v)) setErr('email', 'Please enter a valid email address.')
              }}
              placeholder="you@email.com"
              autoComplete="email"
              className={INPUT}
              style={inputStyle('email')}
            />
            <Err f="email" />
          </div>

          {/* Password */}
          <div>
            <label className={LABEL}>Password <span className="text-gray-600">(min. 8 characters)</span></label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                clearErr('password')
                if (confirmPass) {
                  setErr('confirmPass', e.target.value !== confirmPass ? 'Passwords do not match.' : '')
                }
              }}
              onBlur={e => {
                if (!e.target.value) setErr('password', 'Password is required.')
                else if (e.target.value.length < 8) setErr('password', 'Password must be at least 8 characters.')
              }}
              placeholder="••••••••"
              autoComplete="new-password"
              className={INPUT}
              style={inputStyle('password')}
            />
            <Err f="password" />
          </div>

          {/* Confirm Password */}
          <div>
            <label className={LABEL}>Confirm Password</label>
            <input
              type="password"
              value={confirmPass}
              onChange={e => { setConfirmPass(e.target.value); clearErr('confirmPass') }}
              onBlur={e => {
                if (!e.target.value) setErr('confirmPass', 'Please confirm your password.')
                else if (e.target.value !== password) setErr('confirmPass', 'Passwords do not match.')
              }}
              placeholder="••••••••"
              autoComplete="new-password"
              className={INPUT}
              style={inputStyle('confirmPass')}
            />
            <Err f="confirmPass" />
          </div>

          {/* Date of Birth */}
          <div>
            <label className={LABEL}>Date of Birth</label>
            <DatePicker
              value={dob}
              onChange={v => { setDob(v); clearErr('dob') }}
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

          {/* Phone */}
          <div>
            <label className={LABEL}>Phone <span className="text-gray-600">(optional)</span></label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="04xx xxx xxx"
              className={INPUT}
              style={BASE_STYLE}
            />
          </div>

          {/* Contact section — appears once DOB is entered */}
          {showContact && (
            <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.09)' }}>
              {isUnder18 ? (
                <>
                  <p className={SECTION_HEAD}>Parent / Guardian</p>
                  <div>
                    <label className={LABEL}>Full Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={e => { setGuardianName(e.target.value); clearErr('guardianName') }}
                      onBlur={e => { if (!e.target.value.trim()) setErr('guardianName', 'Guardian name is required.') }}
                      placeholder="Parent or guardian's full name"
                      className={INPUT}
                      style={inputStyle('guardianName')}
                    />
                    <Err f="guardianName" />
                  </div>
                  <div>
                    <label className={LABEL}>Relationship <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={guardianRelationship}
                      onChange={e => { setGuardianRelationship(e.target.value); clearErr('guardianRelationship') }}
                      onBlur={e => { if (!e.target.value.trim()) setErr('guardianRelationship', 'Relationship is required.') }}
                      placeholder="e.g. Mother, Father, Guardian"
                      className={INPUT}
                      style={inputStyle('guardianRelationship')}
                    />
                    <Err f="guardianRelationship" />
                  </div>
                  <div>
                    <label className={LABEL}>Phone <span className="text-red-400">*</span></label>
                    <input
                      type="tel"
                      value={guardianPhone}
                      onChange={e => { setGuardianPhone(e.target.value); clearErr('guardianPhone') }}
                      onBlur={e => { if (!e.target.value.trim()) setErr('guardianPhone', 'Phone number is required.') }}
                      placeholder="04xx xxx xxx"
                      className={INPUT}
                      style={inputStyle('guardianPhone')}
                    />
                    <Err f="guardianPhone" />
                  </div>
                  <div>
                    <label className={LABEL}>Email <span className="text-gray-600">(optional)</span></label>
                    <input
                      type="email"
                      value={guardianEmail}
                      onChange={e => setGuardianEmail(e.target.value)}
                      placeholder="parent@email.com"
                      className={INPUT}
                      style={BASE_STYLE}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className={SECTION_HEAD}>Emergency Contact</p>
                  <div>
                    <label className={LABEL}>Full Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={ecName}
                      onChange={e => { setEcName(e.target.value); clearErr('ecName') }}
                      onBlur={e => { if (!e.target.value.trim()) setErr('ecName', 'Emergency contact name is required.') }}
                      placeholder="Emergency contact's full name"
                      className={INPUT}
                      style={inputStyle('ecName')}
                    />
                    <Err f="ecName" />
                  </div>
                  <div>
                    <label className={LABEL}>Relationship <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={ecRelationship}
                      onChange={e => { setEcRelationship(e.target.value); clearErr('ecRelationship') }}
                      onBlur={e => { if (!e.target.value.trim()) setErr('ecRelationship', 'Relationship is required.') }}
                      placeholder="e.g. Parent, Spouse, Sibling"
                      className={INPUT}
                      style={inputStyle('ecRelationship')}
                    />
                    <Err f="ecRelationship" />
                  </div>
                  <div>
                    <label className={LABEL}>Phone <span className="text-red-400">*</span></label>
                    <input
                      type="tel"
                      value={ecPhone}
                      onChange={e => { setEcPhone(e.target.value); clearErr('ecPhone') }}
                      onBlur={e => { if (!e.target.value.trim()) setErr('ecPhone', 'Phone number is required.') }}
                      placeholder="04xx xxx xxx"
                      className={INPUT}
                      style={inputStyle('ecPhone')}
                    />
                    <Err f="ecPhone" />
                  </div>
                </>
              )}
            </div>
          )}

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <button
            type="submit"
            disabled={loading || !showContact}
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
