import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { coach_id, subscription } = await req.json()
  if (!coach_id || !subscription) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Upsert — replace any existing subscription for this coach+endpoint
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('coach_id', coach_id)

  await supabase
    .from('push_subscriptions')
    .insert({ coach_id, subscription })

  return NextResponse.json({ ok: true })
}
