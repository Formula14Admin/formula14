import { NextRequest, NextResponse } from 'next/server'
import { getAccounts, BASIQ_ROW_ID } from '@/lib/basiq'
import { supabase } from '@/lib/supabase'

// GET /api/basiq/callback
// Basiq redirects here after the user connects their bank.
// Fetches account info and marks the connection as active.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const error = searchParams.get('error')

  if (error) {
    await supabase
      .from('bank_connections')
      .update({ status: 'error', error_message: error, updated_at: new Date().toISOString() })
      .eq('id', BASIQ_ROW_ID)
    return NextResponse.redirect(new URL('/settings?tab=integrations&bankError=1', req.url))
  }

  // Fetch the Basiq user ID from our DB
  const { data: conn } = await supabase
    .from('bank_connections')
    .select('basiq_user_id')
    .eq('id', BASIQ_ROW_ID)
    .single()

  const basiqUserId = conn?.basiq_user_id as string | undefined

  if (!basiqUserId) {
    return NextResponse.redirect(new URL('/settings?tab=integrations&bankError=1', req.url))
  }

  try {
    // Give Basiq a moment to process the connection
    await new Promise(r => setTimeout(r, 2000))

    const accounts = await getAccounts(basiqUserId)
    const primary = accounts[0]

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await supabase
      .from('bank_connections')
      .update({
        status:           'connected',
        basiq_connection_id: primary?.id ?? null,
        account_name:     primary?.name ?? null,
        account_bsb:      primary?.bsb ?? null,
        account_number:   primary?.accountNo ?? null,
        bank_name:        primary?.institution?.shortName ?? null,
        last_sync_cursor: yesterday.toISOString().slice(0, 10),
        error_message:    null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', BASIQ_ROW_ID)

    return NextResponse.redirect(new URL('/settings?tab=integrations&bankConnected=1', req.url))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('bank_connections')
      .update({ status: 'error', error_message: msg, updated_at: new Date().toISOString() })
      .eq('id', BASIQ_ROW_ID)
    return NextResponse.redirect(new URL('/settings?tab=integrations&bankError=1', req.url))
  }
}
