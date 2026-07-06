import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id as string
    const body = await req.json() as {
      firstName: string
      lastName:  string
      dob?:      string | null
      gender?:   string | null
    }

    const firstName = body.firstName?.trim()
    const lastName  = body.lastName?.trim()

    if (!firstName) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('athletes')
      .insert({
        user_id:       userId,
        first_name:    firstName,
        last_name:     lastName || '',
        date_of_birth: body.dob    || null,
        gender:        body.gender || null,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ athleteId: (data as { id: string }).id })
  } catch (err) {
    console.error('[api/athletes/add-child]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
