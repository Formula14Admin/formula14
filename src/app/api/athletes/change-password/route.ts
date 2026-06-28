import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { email, currentPassword, newPassword } = await req.json() as {
      email:           string
      currentPassword: string
      newPassword:     string
    }

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
    }

    // Verify current password
    const { data, error: authError } = await supabase.rpc('authenticate_user', {
      p_email:    email,
      p_password: currentPassword,
    })

    if (authError || !data || (data as unknown[]).length === 0) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
    }

    // Set new password and clear must_change_password
    const { error: updateError } = await supabase.rpc('update_user_password', {
      p_email:        email,
      p_new_password: newPassword,
      p_must_change:  false,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/athletes/change-password]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
