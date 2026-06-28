'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  IconPencil, IconEye, IconCheck, IconX, IconRefresh,
  IconBrandInstagram, IconBrandFacebook, IconBrandTiktok,
  IconPalette,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_BRAND_SETTINGS,
  EMAIL_BRAND_SETTINGS_KEY,
  EMAIL_BRAND_SETTINGS_STORAGE_KEY,
  mergeBrandWithDefaults,
  type EmailBrandSettings,
} from '@/lib/email-brand-settings'
import {
  EMAIL_TEMPLATE_DEFINITIONS,
  getSampleVars,
  type EmailTemplateDefinition,
} from '@/lib/email-template-definitions'
import { applyEmailStyles, buildEmailLayout, substituteVars } from '@/lib/email-layout'
import EmailTemplateEditor from './EmailTemplateEditor'

const ACCENT = '#6BA3D6'

// ── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  template,
  brand,
  customBody,
  onClose,
}: {
  template:    EmailTemplateDefinition
  brand:       EmailBrandSettings
  customBody?: string | null
  onClose:     () => void
}) {
  const body   = customBody ?? template.defaultBody
  const vars   = getSampleVars(template)
  const subbed = substituteVars(body, vars)
  const styled = applyEmailStyles(subbed, brand.primaryColor)
  const html   = buildEmailLayout(styled, brand)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <p className="text-sm font-bold text-gray-900">{template.name}</p>
            <p className="text-xs text-gray-400">Preview with sample data</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <IconX size={16} />
          </button>
        </div>
        <iframe
          srcDoc={html}
          title="Email preview"
          className="flex-1 border-0"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}

// ── Audience badge ────────────────────────────────────────────────────────────

function AudienceBadge({ audience, color }: { audience: string; color: string }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: color + '18', color }}
    >
      {audience}
    </span>
  )
}

// ── Brand settings panel ──────────────────────────────────────────────────────

function BrandSettingsPanel({
  settings,
  onChange,
  saving,
}: {
  settings: EmailBrandSettings
  onChange: (patch: Partial<EmailBrandSettings>) => void
  saving:   boolean
}) {
  const FIELD = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#6BA3D6]'

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: ACCENT + '18' }}>
              <IconPalette size={16} style={{ color: ACCENT }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Brand Settings</h3>
              <p className="text-xs text-gray-400">Applied to all email templates</p>
            </div>
          </div>
          {saving && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <IconRefresh size={11} className="animate-spin" /> Saving…
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Primary Colour</label>
          <div className="flex items-center gap-2">
            <input type="color" value={settings.primaryColor}
              onChange={e => onChange({ primaryColor: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 p-1" />
            <input type="text" value={settings.primaryColor}
              onChange={e => onChange({ primaryColor: e.target.value })}
              className={FIELD} placeholder="#6BA3D6" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Header Background</label>
          <div className="flex items-center gap-2">
            <input type="color" value={settings.headerBg}
              onChange={e => onChange({ headerBg: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 p-1" />
            <input type="text" value={settings.headerBg}
              onChange={e => onChange({ headerBg: e.target.value })}
              className={FIELD} placeholder="#1a1a1a" />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-500">Footer Text</label>
          <input type="text" value={settings.footerText}
            onChange={e => onChange({ footerText: e.target.value })}
            className={FIELD} placeholder="Formula14 Basketball Training — formula14.com.au" />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <IconBrandInstagram size={12} /> Instagram URL
          </label>
          <input type="url" value={settings.instagramUrl}
            onChange={e => onChange({ instagramUrl: e.target.value })}
            className={FIELD} placeholder="https://instagram.com/formula14" />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <IconBrandFacebook size={12} /> Facebook URL
          </label>
          <input type="url" value={settings.facebookUrl}
            onChange={e => onChange({ facebookUrl: e.target.value })}
            className={FIELD} placeholder="https://facebook.com/formula14" />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <IconBrandTiktok size={12} /> TikTok URL
          </label>
          <input type="url" value={settings.tiktokUrl}
            onChange={e => onChange({ tiktokUrl: e.target.value })}
            className={FIELD} placeholder="https://tiktok.com/@formula14" />
        </div>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function EmailTemplatesSection() {
  const [brand,       setBrand]       = useState<EmailBrandSettings>(DEFAULT_BRAND_SETTINGS)
  const [brandSaving, setBrandSaving] = useState(false)
  const brandTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [customised,  setCustomised]  = useState<Record<string, string>>({})
  const [editing,     setEditing]     = useState<EmailTemplateDefinition | null>(null)
  const [previewing,  setPreviewing]  = useState<EmailTemplateDefinition | null>(null)
  const [previewBody, setPreviewBody] = useState<string | null>(null)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(EMAIL_BRAND_SETTINGS_STORAGE_KEY)
      if (cached) setBrand(mergeBrandWithDefaults(JSON.parse(cached)))
    } catch { /* ignore */ }

    supabase
      .from('app_settings')
      .select('value')
      .eq('key', EMAIL_BRAND_SETTINGS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const merged = mergeBrandWithDefaults(data.value as Partial<EmailBrandSettings>)
          setBrand(merged)
          try { localStorage.setItem(EMAIL_BRAND_SETTINGS_STORAGE_KEY, JSON.stringify(merged)) } catch { /* ignore */ }
        }
      })

    refreshCustomised()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function refreshCustomised() {
    supabase
      .from('email_templates')
      .select('id, updated_at')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {}
          data.forEach((r: { id: string; updated_at: string }) => { map[r.id] = r.updated_at })
          setCustomised(map)
        }
      })
  }

  const handleBrandChange = useCallback((patch: Partial<EmailBrandSettings>) => {
    setBrand(prev => {
      const next = { ...prev, ...patch }
      if (brandTimer.current) clearTimeout(brandTimer.current)
      setBrandSaving(true)
      brandTimer.current = setTimeout(async () => {
        try { localStorage.setItem(EMAIL_BRAND_SETTINGS_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
        await supabase.from('app_settings').upsert({ key: EMAIL_BRAND_SETTINGS_KEY, value: next })
        setBrandSaving(false)
      }, 800)
      return next
    })
  }, [])

  async function openPreview(tmpl: EmailTemplateDefinition) {
    const { data } = await supabase
      .from('email_templates')
      .select('body_html')
      .eq('id', tmpl.id)
      .maybeSingle()
    setPreviewBody(data?.body_html ?? null)
    setPreviewing(tmpl)
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const groups: { label: string; audience: EmailTemplateDefinition['audience'] }[] = [
    { label: 'Athlete Notifications',  audience: 'Athlete'  },
    { label: 'Admin Notifications',    audience: 'Admin'    },
    { label: 'Finance Notifications',  audience: 'Finance'  },
    { label: 'HR Notifications',       audience: 'HR'       },
  ]

  return (
    <>
      <BrandSettingsPanel settings={brand} onChange={handleBrandChange} saving={brandSaving} />

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-base font-bold text-gray-900">Email Templates</h2>
          <p className="text-xs text-gray-400">
            Customise the content and subject of every outbound email. Defaults are used until a template is edited.
          </p>
        </div>

        {groups.map(({ label, audience }) => {
          const templates = EMAIL_TEMPLATE_DEFINITIONS.filter(t => t.audience === audience)
          return (
            <div key={audience}>
              <div className="border-b border-t border-gray-50 bg-gray-50 px-6 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {templates.map(tmpl => {
                  const isCustom = !!customised[tmpl.id]
                  return (
                    <div key={tmpl.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{tmpl.name}</p>
                          <AudienceBadge audience={tmpl.audience} color={tmpl.audienceColor} />
                          {isCustom && (
                            <span className="flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              <IconCheck size={9} /> Customised
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-400">{tmpl.defaultSubject}</p>
                        {isCustom && (
                          <p className="text-[10px] text-gray-400">Last edited: {fmtDate(customised[tmpl.id])}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => openPreview(tmpl)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
                        >
                          <IconEye size={12} /> Preview
                        </button>
                        <button
                          onClick={() => setEditing(tmpl)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                          style={{ backgroundColor: ACCENT }}
                        >
                          <IconPencil size={12} /> Edit
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {previewing && (
        <PreviewModal
          template={previewing}
          brand={brand}
          customBody={previewBody}
          onClose={() => { setPreviewing(null); setPreviewBody(null) }}
        />
      )}

      {editing && (
        <EmailTemplateEditor
          template={editing}
          brandSettings={brand}
          onClose={() => setEditing(null)}
          onSaved={refreshCustomised}
        />
      )}
    </>
  )
}
