import { NextRequest, NextResponse } from 'next/server'
import { getTransactions, BASIQ_ROW_ID } from '@/lib/basiq'
import { supabase } from '@/lib/supabase'

// GET /api/basiq/transactions?from=YYYY-MM-DD
// Returns raw Basiq transactions (not yet imported) for preview / debugging
export async function GET(req: NextRequest) {
  if (!process.env.BASIQ_API_KEY) {
    return NextResponse.json({ error: 'BASIQ_API_KEY not configured' }, { status: 503 })
  }

  const { data: conn } = await supabase
    .from('bank_connections')
    .select('basiq_user_id, status, last_sync_cursor')
    .eq('id', BASIQ_ROW_ID)
    .single()

  if (!conn || conn.status !== 'connected' || !conn.basiq_user_id) {
    return NextResponse.json({ error: 'No connected bank account' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const fromDate = searchParams.get('from') ??
    (conn.last_sync_cursor as string | null) ??
    new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)

  try {
    const transactions = await getTransactions(conn.basiq_user_id as string, fromDate)
    return NextResponse.json({ transactions, count: transactions.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
