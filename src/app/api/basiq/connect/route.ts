import { NextRequest, NextResponse } from 'next/server'
import { createBasiqUser, createAuthLink, BASIQ_ROW_ID } from '@/lib/basiq'
import { supabase } from '@/lib/supabase'

// POST /api/basiq/connect
// Creates a Basiq user (if needed) and returns the bank auth link URL
export async function POST(req: NextRequest) {
  if (!process.env.BASIQ_API_KEY) {
    return NextResponse.json({ error: 'BASIQ_API_KEY not configured' }, { status: 503 })
  }

  const origin = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const redirectUrl = `${origin}/api/basiq/callback`

  // Load existing connection record
  const { data: conn } = await supabase
    .from('bank_connections')
    .select('basiq_user_id')
    .eq('id', BASIQ_ROW_ID)
    .single()

  let basiqUserId = conn?.basiq_user_id as string | undefined

  try {
    if (!basiqUserId) {
      basiqUserId = await createBasiqUser('admin@formula14.com.au')
      await supabase
        .from('bank_connections')
        .update({ basiq_user_id: basiqUserId, status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', BASIQ_ROW_ID)
    } else {
      await supabase
        .from('bank_connections')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', BASIQ_ROW_ID)
    }

    const authUrl = await createAuthLink(basiqUserId, redirectUrl)
    return NextResponse.json({ url: authUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('bank_connections')
      .update({ status: 'error', error_message: msg, updated_at: new Date().toISOString() })
      .eq('id', BASIQ_ROW_ID)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
