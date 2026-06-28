import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/resend'
import { athleteInvitation } from '@/lib/email-templates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

function tempPassword(): string {
  return `Formula14#${String(Math.floor(1000 + Math.random() * 9000))}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      firstName:      string
      lastName:       string
      email?:         string | null
      phone?:         string | null
      dob?:           string | null
      position?:      string | null
      school?:        string | null
      goals?:         string | null
      coachNotes?:    string | null
      emergencyName?:  string | null
      emergencyPhone?: string | null
      emergencyRel?:   string | null
      membershipPlan?: string      // e.g. "Gold — $75/week" — included in email
    }

    const email = body.email?.trim() || null

    if (!email) {
      // No email → create athlete record only, no user account
      const { data, error } = await supabase.from('athletes').insert({
        first_name:    body.firstName?.trim() || '',
        last_name:     body.lastName?.trim()  || '',
        phone:         body.phone?.trim()     || null,
        date_of_birth: body.dob              || null,
        position:      body.position         || null,
        school:        body.school?.trim()    || null,
        goals:         body.goals?.trim()     || null,
        coach_notes:   body.coachNotes?.trim()|| null,
        emergency_contact_name:         body.emergencyName?.trim()  || null,
        emergency_contact_phone:        body.emergencyPhone?.trim() || null,
        emergency_contact_relationship: body.emergencyRel?.trim()   || null,
      }).select('id').single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ athleteId: (data as { id: string }).id, created: false, emailSent: false })
    }

    const pwd = tempPassword()

    // Create user account + athlete record via SECURITY DEFINER RPC
    const { data, error } = await supabase.rpc('create_athlete_account', {
      p_email:           email,
      p_password:        pwd,
      p_first_name:      body.firstName?.trim() || '',
      p_last_name:       body.lastName?.trim()  || '',
      p_phone:           body.phone?.trim()       || null,
      p_dob:             body.dob                || null,
      p_position:        body.position           || null,
      p_school:          body.school?.trim()      || null,
      p_goals:           body.goals?.trim()       || null,
      p_coach_notes:     body.coachNotes?.trim()  || null,
      p_emergency_name:  body.emergencyName?.trim()  || null,
      p_emergency_phone: body.emergencyPhone?.trim() || null,
      p_emergency_rel:   body.emergencyRel?.trim()   || null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const row        = (data as { athlete_id: string; user_id: string; is_new_account: boolean }[])[0]
    const athleteId  = row?.athlete_id
    const isNew      = row?.is_new_account ?? false

    let emailSent = false
    if (isNew) {
      const { subject, html } = athleteInvitation({
        firstName:         body.firstName?.trim() || '',
        lastName:          body.lastName?.trim()  || '',
        email,
        temporaryPassword: pwd,
        membershipPlan:    body.membershipPlan,
      })
      const result = await resend.emails.send({
        from:    FROM_EMAIL,
        to:      email,
        replyTo: REPLY_TO,
        subject,
        html,
      })
      emailSent = !result.error
      if (result.error) console.error('[create-account] resend error:', result.error)
    }

    return NextResponse.json({ athleteId, created: isNew, emailSent })
  } catch (err) {
    console.error('[api/athletes/create-account]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
