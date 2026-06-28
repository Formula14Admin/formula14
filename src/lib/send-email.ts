import type { TemplateName } from '@/lib/email-templates'

export interface SendEmailPayload {
  template: TemplateName
  to:       string | string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data:     Record<string, any>
}

export interface SendEmailResult {
  success: boolean
  error?:  string
}

export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  try {
    const res = await fetch('/api/send-email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text()
      return { success: false, error: body || `HTTP ${res.status}` }
    }
    return res.json() as Promise<SendEmailResult>
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
