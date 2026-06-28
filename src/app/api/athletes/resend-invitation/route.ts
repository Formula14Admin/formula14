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
    const { athleteId } = await req.json() as { athleteId: string }

    const { data: athlete } = await supabase
      .from('athletes')
      .select('first_name, last_name, email, membership_tier')
      .eq('id', athleteId)
      .maybeSingle()

    if (!athlete?.email) {
      return NextResponse.json({ error: 'Athlete has no email address on file.' }, { status: 400 })
    }

    const pwd = tempPassword()

    // Reset to a new temp password and re-enable must_change_password
    await supabase.rpc('update_user_password', {
      p_email:       athlete.email as string,
      p_new_password: pwd,
      p_must_change:  true,
    })

    // Reset invite_status so the badge shows "Invited" again in admin
    await supabase
      .from('athletes')
      .update({ invite_status: 'invited' })
      .eq('id', athleteId)

    const tier = athlete.membership_tier as string | null
    const membershipPlan = tier
      ? `${tier.charAt(0).toUpperCase() + tier.slice(1)}`
      : undefined

    const { subject, html } = athleteInvitation({
      firstName:         athlete.first_name as string,
      lastName:          athlete.last_name  as string,
      email:             athlete.email      as string,
      temporaryPassword: pwd,
      membershipPlan,
    })

    const result = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      athlete.email as string,
      replyTo: REPLY_TO,
      subject,
      html,
    })

    if (result.error) {
      console.error('[resend-invitation] resend error:', result.error)
      return NextResponse.json({ error: 'Email send failed — account was reset.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/athletes/resend-invitation]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
