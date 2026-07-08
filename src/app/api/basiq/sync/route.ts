import { NextResponse } from 'next/server'
import { getTransactions, BASIQ_ROW_ID } from '@/lib/basiq'
import { supabase } from '@/lib/supabase'

// Maps Basiq category strings to our finance categories
function mapCategory(basiqCat: string | undefined, type: 'income' | 'expense'): string {
  if (type === 'income') return 'other-income'
  const c = (basiqCat ?? '').toLowerCase()
  if (c.includes('wage') || c.includes('salary') || c.includes('payroll')) return 'wages'
  if (c.includes('rent') || c.includes('facility') || c.includes('venue'))  return 'facility'
  if (c.includes('equipment') || c.includes('sport'))                       return 'equipment'
  if (c.includes('insurance'))                                               return 'insurance'
  if (c.includes('market') || c.includes('adverti'))                        return 'marketing'
  if (c.includes('utility') || c.includes('electric') || c.includes('gas')) return 'utilities'
  return 'other-expense'
}

// POST /api/basiq/sync
// Imports new transactions from Basiq into finance_transactions
export async function POST() {
  if (!process.env.BASIQ_API_KEY) {
    return NextResponse.json({ error: 'BASIQ_API_KEY not configured' }, { status: 503 })
  }

  const { data: conn } = await supabase
    .from('bank_connections')
    .select('basiq_user_id, last_sync_cursor, status')
    .eq('id', BASIQ_ROW_ID)
    .single()

  if (!conn || conn.status !== 'connected' || !conn.basiq_user_id) {
    return NextResponse.json({ error: 'No connected bank account' }, { status: 400 })
  }

  const fromDate = (conn.last_sync_cursor as string | null) ??
    new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)

  try {
    const txns = await getTransactions(conn.basiq_user_id as string, fromDate)

    if (txns.length === 0) {
      await supabase
        .from('bank_connections')
        .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', BASIQ_ROW_ID)
      return NextResponse.json({ imported: 0 })
    }

    // Deduplicate against existing bank-sourced transactions by reference
    const refs = txns.map(t => t.id)
    const { data: existing } = await supabase
      .from('finance_transactions')
      .select('reference')
      .in('reference', refs)
      .eq('source', 'bank')
    const existingRefs = new Set((existing ?? []).map((r: { reference: string }) => r.reference))

    const toInsert = txns
      .filter(t => !existingRefs.has(t.id))
      .map(t => {
        const amount = Math.abs(parseFloat(t.amount))
        const type: 'income' | 'expense' = parseFloat(t.amount) >= 0 ? 'income' : 'expense'
        return {
          date:        t.postDate,
          description: t.description.trim() || 'Bank transaction',
          type,
          category:    mapCategory(t.subCategory ?? t.category, type),
          amount,
          reference:   t.id,
          source:      'bank',
        }
      })

    if (toInsert.length > 0) {
      await supabase.from('finance_transactions').insert(toInsert)
    }

    // Advance the cursor to today
    const newCursor = new Date().toISOString().slice(0, 10)
    await supabase
      .from('bank_connections')
      .update({
        last_synced_at:   new Date().toISOString(),
        last_sync_cursor: newCursor,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', BASIQ_ROW_ID)

    return NextResponse.json({ imported: toInsert.length, total: txns.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
