import type { EmailBrandSettings } from './email-brand-settings'

// ─── Variable substitution ────────────────────────────────────────────────────

export function substituteVars(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? vars[key] : `{{${key}}}`
  )
}

export function buildVariablesFromData(data: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(data)) {
    result[key] = String(val ?? '')
    // camelCase → snake_case
    const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    result[snake] = String(val ?? '')
  }
  // Common aliases so {{session_date}} works when data has `date`
  if (result['date'] && !result['session_date'])     result['session_date']  = result['date']
  if (result['time'] && !result['session_time'])     result['session_time']  = result['time']
  if (result['coach'] && !result['coach_name'])      result['coach_name']    = result['coach']
  if (result['login_url'] && !result['login_link'])  result['login_link']    = result['login_url']
  if (result['reset_url'] && !result['reset_link'])  result['reset_link']    = result['reset_url']
  if (result['expires_in'] && !result['expiry_time']) result['expiry_time']  = result['expires_in']
  // Build athlete_name from firstName + lastName if needed
  if (!result['athlete_name']) {
    const fn = result['first_name'] || result['firstName'] || ''
    const ln = result['last_name']  || result['lastName']  || ''
    if (fn) result['athlete_name'] = `${fn} ${ln}`.trim()
  }
  return result
}

// ─── Email-safe style injection ───────────────────────────────────────────────

export function applyEmailStyles(html: string, primaryColor: string): string {
  const pc = primaryColor
  return html
    .replace(/<h1(?![^>]*style=)([^>]*)>/gi,
      `<h1$1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">`)
    .replace(/<h2(?![^>]*style=)([^>]*)>/gi,
      `<h2$1 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">`)
    .replace(/<h3(?![^>]*style=)([^>]*)>/gi,
      `<h3$1 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">`)
    .replace(/<p(?![^>]*style=)([^>]*)>/gi,
      `<p$1 style="margin:12px 0;font-size:15px;line-height:1.6;color:#374151;">`)
    .replace(/<ul(?![^>]*style=)([^>]*)>/gi,
      `<ul$1 style="margin:8px 0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">`)
    .replace(/<ol(?![^>]*style=)([^>]*)>/gi,
      `<ol$1 style="margin:8px 0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">`)
    .replace(/<li(?![^>]*style=)([^>]*)>/gi,
      `<li$1 style="margin:4px 0;">`)
    .replace(/<hr(?![^>]*style=)([^>]*)\/?>/gi,
      `<hr$1 style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`)
    .replace(/<blockquote(?![^>]*style=)([^>]*)>/gi,
      `<blockquote$1 style="margin:16px 0;padding:12px 16px;border-left:4px solid #e5e7eb;color:#6b7280;font-style:italic;">`)
    // CTA button links (data-cta attribute)
    .replace(/<a([^>]*) data-cta="true"([^>]*)>/gi,
      `<a$1$2 style="display:inline-block;margin-top:24px;background:${pc};color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.3px;padding:12px 28px;border-radius:8px;text-decoration:none;">`)
    // Regular links (no data-cta, no existing style)
    .replace(/<a(?![^>]*data-cta)(?![^>]*style=)([^>]*)>/gi,
      `<a$1 style="color:${pc};text-decoration:none;">`)
}

// ─── Branded email layout ─────────────────────────────────────────────────────

export function buildEmailLayout(body: string, brand: EmailBrandSettings): string {
  const social = [
    brand.instagramUrl && `<a href="${brand.instagramUrl}" style="color:${brand.primaryColor};text-decoration:none;margin:0 6px;font-size:12px;">Instagram</a>`,
    brand.facebookUrl  && `<a href="${brand.facebookUrl}"  style="color:${brand.primaryColor};text-decoration:none;margin:0 6px;font-size:12px;">Facebook</a>`,
    brand.tiktokUrl    && `<a href="${brand.tiktokUrl}"    style="color:${brand.primaryColor};text-decoration:none;margin:0 6px;font-size:12px;">TikTok</a>`,
  ].filter(Boolean).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Formula14</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td style="background:${brand.headerBg};border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
          <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;font-family:sans-serif;">
            FORMULA<span style="color:${brand.primaryColor}">14</span>
          </span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          ${body}
        </td></tr>
        <tr><td style="background:${brand.headerBg};border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${brand.footerText}</p>
          ${social ? `<p style="margin:8px 0 0;">${social}</p>` : ''}
          <p style="margin:8px 0 0;font-size:11px;color:#6b7280;">You&rsquo;re receiving this because you have an account with Formula14.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Combined helper for custom templates ─────────────────────────────────────

export function buildCustomEmailHtml(
  bodyHtml: string,
  data: Record<string, unknown>,
  brand: EmailBrandSettings,
): { subject?: never; html: string } & { html: string } {
  const vars   = buildVariablesFromData(data)
  const subbed = substituteVars(bodyHtml, vars)
  const styled = applyEmailStyles(subbed, brand.primaryColor)
  return { html: buildEmailLayout(styled, brand) }
}
