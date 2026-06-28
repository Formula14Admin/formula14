import { NextRequest, NextResponse } from 'next/server'
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/resend'
import { renderTemplate, type TemplateName } from '@/lib/email-templates'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client for logging (uses anon key — no secrets exposed)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dydrtbrhhgyppancbhpy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

async function logEmail(params: {
  template: string
  recipient: string
  subject: string
  status: 'sent' | 'failed'
  resendId?: string
  error?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
}) {
  try {
    await supabase.from('email_logs').insert({
      template:  params.template,
      recipient: params.recipient,
      subject:   params.subject,
      status:    params.status,
      resend_id: params.resendId ?? null,
      error:     params.error ?? null,
      metadata:  params.metadata ?? {},
    })
  } catch {
    // Log failures are non-fatal
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      template: TemplateName
      to:       string | string[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:     Record<string, any>
    }

    const { template, to, data } = body

    if (!template || !to) {
      return NextResponse.json({ success: false, error: 'Missing template or to' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const { subject, html } = renderTemplate(template, data)

    const recipients = Array.isArray(to) ? to : [to]

    const results = await Promise.allSettled(
      recipients.map(async (email) => {
        const { data: sent, error } = await resend.emails.send({
          from:     FROM_EMAIL,
          to:       email,
          replyTo:  REPLY_TO,
          subject,
          html,
        })

        if (error) {
          await logEmail({ template, recipient: email, subject, status: 'failed', error: error.message })
          throw new Error(error.message)
        }

        await logEmail({ template, recipient: email, subject, status: 'sent', resendId: sent?.id })
        return { email, id: sent?.id }
      })
    )

    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length > 0) {
      const errs = failed.map(r => (r as PromiseRejectedResult).reason?.message ?? 'Unknown error')
      return NextResponse.json({
        success: false,
        error: `Failed for ${failed.length}/${recipients.length} recipient(s): ${errs.join('; ')}`,
      }, { status: 207 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send-email] unhandled error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
