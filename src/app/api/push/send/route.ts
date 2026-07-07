export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const { coach_id, title, body } = await req.json()
  if (!coach_id || !title) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: rows } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('coach_id', coach_id)

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const results = await Promise.allSettled(
    rows.map(r =>
      webpush.sendNotification(r.subscription, JSON.stringify({ title, body }))
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ ok: true, sent })
}
