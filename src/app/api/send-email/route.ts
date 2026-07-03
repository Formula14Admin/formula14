import { NextRequest, NextResponse } from 'next/server'
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/resend'
import { renderTemplate, type TemplateName } from '@/lib/email-templates'
import {
  TEMPLATE_TO_NOTIF_KEY,
  ALWAYS_SEND_TEMPLATES,
  NOTIFICATION_SETTINGS_KEY,
  mergeNotifWithDefaults,
  type NotificationSettings,
  type CheckableNotifKey,
} from '@/lib/notification-settings'
import {
  EMAIL_BRAND_SETTINGS_KEY,
  mergeBrandWithDefaults,
} from '@/lib/email-brand-settings'
import {
  applyEmailStyles,
  buildEmailLayout,
  buildVariablesFromData,
  substituteVars,
} from '@/lib/email-layout'
import {
  getTemplateDefinition,
  getSampleVars,
} from '@/lib/email-template-definitions'
import { supabase } from '@/lib/supabase'

// ─── Notification settings check ─────────────────────────────────────────────

async function fetchNotifSettings(): Promise<NotificationSettings> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', NOTIFICATION_SETTINGS_KEY)
      .single()
    if (data?.value) return mergeNotifWithDefaults(data.value as Partial<NotificationSettings>)
  } catch { /* fall through to defaults */ }
  return mergeNotifWithDefaults({})
}

function isWithinSendingHours(start: number, end: number): boolean {
  // Use Australia/Sydney timezone
  const now = new Date()
  const sydneyHour = parseInt(
    now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney', hour: 'numeric', hour12: false }),
    10
  )
  return sydneyHour >= start && sydneyHour < end
}

interface BlockResult { blocked: true; reason: string }
interface PassResult  { blocked: false }
type GateResult = BlockResult | PassResult

async function checkNotificationGate(template: TemplateName, isTest: boolean): Promise<GateResult> {
  // Test sends bypass all gates
  if (isTest) return { blocked: false }

  // Always-send templates bypass gates
  if (ALWAYS_SEND_TEMPLATES.includes(template)) return { blocked: false }

  const settings = await fetchNotifSettings()

  // 1. Global pause
  if (settings.paused) return { blocked: true, reason: 'Notifications are globally paused' }

  // 2. Sending hours
  const { start, end } = settings.sendingHours
  if (!isWithinSendingHours(start, end)) {
    return { blocked: true, reason: `Outside sending hours (${start}:00–${end}:00 AEST)` }
  }

  // 3. Per-notification enabled check
  const notifKey = TEMPLATE_TO_NOTIF_KEY[template] as CheckableNotifKey | undefined
  if (notifKey) {
    const notif = settings[notifKey] as { enabled: boolean } | undefined
    if (notif && !notif.enabled) {
      return { blocked: true, reason: `Notification "${notifKey}" is disabled` }
    }
  }

  return { blocked: false }
}

// ─── Email log ────────────────────────────────────────────────────────────────

async function logEmail(params: {
  template: string
  recipient: string
  subject:   string
  status:    'sent' | 'failed' | 'skipped'
  resendId?: string
  error?:    string
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
  } catch { /* non-fatal */ }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      template:      string
      to:            string | string[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:          Record<string, any>
      test?:         boolean
      _testBody?:    string
      _testSubject?: string
    }

    const { template, to, data, test: isTest = false, _testBody, _testSubject } = body

    if (!template || !to) {
      return NextResponse.json({ success: false, error: 'Missing template or to' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    // Check notification gates
    const gate = await checkNotificationGate(template as TemplateName, isTest)
    if (gate.blocked) {
      return NextResponse.json({ success: true, skipped: true, reason: gate.reason })
    }

    // ── Resolve subject + html ─────────────────────────────────────────────
    let subject: string
    let html:    string

    if (isTest && _testBody) {
      // Editor test send: use body/subject directly from the editor (bypass Supabase)
      const [brandRow] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', EMAIL_BRAND_SETTINGS_KEY).maybeSingle(),
      ])
      const brand = mergeBrandWithDefaults((brandRow.data?.value ?? {}) as Parameters<typeof mergeBrandWithDefaults>[0])
      const vars  = buildVariablesFromData(data)
      // Merge with sample vars so unfilled variables still show something
      const defn  = getTemplateDefinition(template)
      const sampleVars = defn ? getSampleVars(defn) : {}
      const allVars = { ...sampleVars, ...vars }
      const subbed  = substituteVars(_testBody, allVars)
      const styled  = applyEmailStyles(subbed, brand.primaryColor)
      subject = _testSubject ?? template
      html    = buildEmailLayout(styled, brand)
    } else {
      // Check Supabase for a custom template
      const [customRow, brandRow] = await Promise.all([
        supabase.from('email_templates').select('subject, body_html').eq('id', template).maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', EMAIL_BRAND_SETTINGS_KEY).maybeSingle(),
      ])

      if (customRow.data) {
        const brand = mergeBrandWithDefaults((brandRow.data?.value ?? {}) as Parameters<typeof mergeBrandWithDefaults>[0])
        const vars  = buildVariablesFromData(data)
        subject     = substituteVars(customRow.data.subject, vars)
        const subbed = substituteVars(customRow.data.body_html, vars)
        const styled = applyEmailStyles(subbed, brand.primaryColor)
        html = buildEmailLayout(styled, brand)
      } else {
        // Fall back to hardcoded template
        try {
          const rendered = renderTemplate(template as TemplateName, data)
          subject = rendered.subject
          html    = rendered.html
        } catch {
          // Template not in hardcoded registry — try definition defaults
          const defn = getTemplateDefinition(template)
          if (!defn) {
            return NextResponse.json({ success: false, error: `Unknown template: ${template}` }, { status: 400 })
          }
          const brand = mergeBrandWithDefaults((brandRow.data?.value ?? {}) as Parameters<typeof mergeBrandWithDefaults>[0])
          const vars  = { ...getSampleVars(defn), ...buildVariablesFromData(data) }
          subject     = substituteVars(defn.defaultSubject, vars)
          const subbed = substituteVars(defn.defaultBody, vars)
          const styled = applyEmailStyles(subbed, brand.primaryColor)
          html = buildEmailLayout(styled, brand)
        }
      }
    }

    const recipients  = Array.isArray(to) ? to : [to]
    const testSubject = isTest ? `[TEST] ${subject}` : subject

    const results = await Promise.allSettled(
      recipients.map(async (email) => {
        const { data: sent, error } = await resend.emails.send({
          from:    FROM_EMAIL,
          to:      email,
          replyTo: REPLY_TO,
          subject: testSubject,
          html,
        })

        if (error) {
          await logEmail({ template, recipient: email, subject: testSubject, status: 'failed', error: error.message, metadata: { test: isTest } })
          throw new Error(error.message)
        }

        await logEmail({ template, recipient: email, subject: testSubject, status: 'sent', resendId: sent?.id, metadata: { test: isTest } })
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
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
