import { NextResponse } from 'next/server'
import { getTransactions, BASIQ_ROW_ID } from '@/lib/basiq'
import { supabase } from '@/lib/supabase'

// Maps Basiq sub/category strings to our finance expense categories
function mapCategory(cat: string | undefined, type: 'income' | 'expense'): string {
  if (type === 'income') return 'other-income'
  const c = (cat ?? '').toLowerCase()
  if (c.includes('wage') || c.includes('salary') || c.includes('payroll')) return 'wages'
  if (c.includes('rent') || c.includes('facility') || c.includes('venue'))  return 'facility'
  if (c.includes('equipment') || c.includes('sport'))                       return 'equipment'
  if (c.includes('insurance'))                                               return 'insurance'
  if (c.includes('market') || c.includes('adverti'))                        return 'marketing'
  if (c.includes('utility') || c.includes('electric') || c.includes('gas')) return 'utilities'
  if (c.includes('admin') || c.includes('office') || c.includes('stationer')) return 'admin'
  return 'other-expense'
}

async function runSync(): Promise<{ imported: number; total: number }> {
  const { data: conn } = await supabase
    .from('bank_connections')
    .select('basiq_user_id, last_sync_cursor, status')
    .eq('id', BASIQ_ROW_ID)
    .single()

  if (!conn || conn.status !== 'connected' || !conn.basiq_user_id) {
    throw new Error('No connected bank account')
  }

  // Default: go back 90 days on first sync
  const fromDate = (conn.last_sync_cursor as string | null) ??
    new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)

  const txns = await getTransactions(conn.basiq_user_id as string, fromDate)

  if (txns.length === 0) {
    await supabase
      .from('bank_connections')
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', BASIQ_ROW_ID)
    return { imported: 0, total: 0 }
  }

  // Primary dedup: Basiq transaction ID stored in `reference` column
  const refs = txns.map(t => t.id)
  const { data: existing } = await supabase
    .from('finance_transactions')
    .select('reference')
    .in('reference', refs)
    .eq('source', 'basiq')
  const existingRefs = new Set((existing ?? []).map((r: { reference: string }) => r.reference))

  const toInsert = txns
    .filter(t => !existingRefs.has(t.id))
    .map(t => {
      const raw    = parseFloat(t.amount)
      const amount = Math.abs(raw)
      // Basiq: positive amount = credit (money in), negative = debit (money out)
      const type: 'income' | 'expense' = raw >= 0 ? 'income' : 'expense'
      return {
        date:        t.postDate,
        description: t.description.trim() || 'Bank transaction',
        type,
        category:    mapCategory(t.subCategory ?? t.category, type),
        amount,
        reference:   t.id,
        notes:       t.category ? `Basiq category: ${t.subCategory ?? t.category}` : null,
        source:      'basiq',
      }
    })

  if (toInsert.length > 0) {
    await supabase.from('finance_transactions').insert(toInsert)
  }

  const newCursor = new Date().toISOString().slice(0, 10)
  await supabase
    .from('bank_connections')
    .update({
      last_synced_at:   new Date().toISOString(),
      last_sync_cursor: newCursor,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', BASIQ_ROW_ID)

  return { imported: toInsert.length, total: txns.length }
}

// POST /api/basiq/sync — triggered manually from UI
export async function POST() {
  if (!process.env.BASIQ_API_KEY) {
    return NextResponse.json({ error: 'BASIQ_API_KEY not configured' }, { status: 503 })
  }
  try {
    const result = await runSync()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET /api/basiq/sync — called by Vercel cron
export async function GET() {
  if (!process.env.BASIQ_API_KEY) {
    return NextResponse.json({ error: 'BASIQ_API_KEY not configured' }, { status: 503 })
  }
  try {
    const result = await runSync()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
