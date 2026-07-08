import { NextResponse } from 'next/server'
import { getAccounts, BASIQ_ROW_ID } from '@/lib/basiq'
import { supabase } from '@/lib/supabase'

// GET /api/basiq/accounts
// Returns account details (name, BSB, balance) for the connected bank account
export async function GET() {
  if (!process.env.BASIQ_API_KEY) {
    return NextResponse.json({ error: 'BASIQ_API_KEY not configured' }, { status: 503 })
  }

  const { data: conn } = await supabase
    .from('bank_connections')
    .select('basiq_user_id, status')
    .eq('id', BASIQ_ROW_ID)
    .single()

  if (!conn || conn.status !== 'connected' || !conn.basiq_user_id) {
    return NextResponse.json({ error: 'No connected bank account' }, { status: 400 })
  }

  try {
    const accounts = await getAccounts(conn.basiq_user_id as string)
    return NextResponse.json({ accounts })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
