export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { coach_id, subscription } = await req.json()
  if (!coach_id || !subscription) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await supabase.from('push_subscriptions').delete().eq('coach_id', coach_id)
  await supabase.from('push_subscriptions').insert({ coach_id, subscription })

  return NextResponse.json({ ok: true })
}
