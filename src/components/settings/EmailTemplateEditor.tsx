'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  IconX, IconDeviceDesktop, IconDeviceMobile,
  IconRefresh, IconSend, IconCheck, IconClipboardCopy,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { applyEmailStyles, buildEmailLayout, substituteVars } from '@/lib/email-layout'
import { getSampleVars, type EmailTemplateDefinition } from '@/lib/email-template-definitions'
import type { EmailBrandSettings } from '@/lib/email-brand-settings'
import EmailRichTextEditor from './EmailRichTextEditor'

const ACCENT = '#6BA3D6'

interface Props {
  template:      EmailTemplateDefinition
  brandSettings: EmailBrandSettings
  onClose:       () => void
  onSaved:       () => void
}

export default function EmailTemplateEditor({ template, brandSettings, onClose, onSaved }: Props) {
  const [subject,      setSubject]      = useState(template.defaultSubject)
  const [bodyHtml,     setBodyHtml]     = useState(template.defaultBody)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [hasCustom,    setHasCustom]    = useState(false)
  const [previewMode,  setPreviewMode]  = useState<'desktop' | 'mobile'>('desktop')
  const [sendingTest,  setSendingTest]  = useState(false)
  const [testResult,   setTestResult]   = useState<'sent' | 'error' | null>(null)
  const [copiedVar,    setCopiedVar]    = useState<string | null>(null)
  const getHtmlRef = useRef<(() => string) | null>(null)

  // Load custom template from Supabase on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('email_templates')
        .select('subject, body_html')
        .eq('id', template.id)
        .maybeSingle()
      if (data) {
        setSubject(data.subject)
        setBodyHtml(data.body_html)
        setHasCustom(true)
      }
      setLoading(false)
    }
    load()
  }, [template.id])

  const sampleVars = useMemo(() => getSampleVars(template), [template])

  const previewHtml = useMemo(() => {
    const substituted = substituteVars(bodyHtml, sampleVars)
    const styled      = applyEmailStyles(substituted, brandSettings.primaryColor)
    return buildEmailLayout(styled, brandSettings)
  }, [bodyHtml, sampleVars, brandSettings])

  async function handleSave() {
    const html = getHtmlRef.current?.() ?? bodyHtml
    setSaving(true)
    await supabase.from('email_templates').upsert({
      id:        template.id,
      subject,
      body_html: html,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    setSaved(true)
    setHasCustom(true)
    setTimeout(() => setSaved(false), 2500)
    onSaved()
  }

  async function handleReset() {
    if (!window.confirm('Reset to the default template? Any custom edits will be lost.')) return
    await supabase.from('email_templates').delete().eq('id', template.id)
    setSubject(template.defaultSubject)
    setBodyHtml(template.defaultBody)
    setHasCustom(false)
    onSaved()
  }

  async function handleSendTest() {
    const html    = getHtmlRef.current?.() ?? bodyHtml
    const subVars = { ...sampleVars }
    setSendingTest(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template:    template.id,
          to:          'matt@formula14.com.au',
          data:        subVars,
          test:        true,
          _testBody:   html,
          _testSubject: substituteVars(subject, subVars),
        }),
      })
      const json = await res.json() as { success: boolean }
      setTestResult(json.success ? 'sent' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setSendingTest(false)
    }
  }

  function copyVariable(key: string) {
    navigator.clipboard.writeText(`{{${key}}}`).catch(() => {})
    setCopiedVar(key)
    setTimeout(() => setCopiedVar(null), 1500)
  }

  const handleEditorReady = useCallback((getFn: () => string) => {
    getHtmlRef.current = getFn
  }, [])

  const handleBodyChange = useCallback((html: string) => {
    setBodyHtml(html)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#f4f6f9' }}>
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <IconX size={18} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-gray-900">{template.name}</h2>
            <p className="text-xs text-gray-400">
              {hasCustom ? 'Custom template — saved to Supabase' : 'Default template — not yet customised'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasCustom && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
            >
              <IconRefresh size={12} /> Reset to default
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? <IconRefresh size={12} className="animate-spin" /> : saved ? <IconCheck size={12} /> : <IconSend size={12} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: ACCENT }} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Editor panel ─────────────────────────────────────── */}
          <div className="flex w-[44%] shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
            <div className="space-y-4 p-6">

              {/* Subject */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
                  placeholder="Email subject…"
                />
              </div>

              {/* Body editor */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  Email Body
                </label>
                <EmailRichTextEditor
                  content={bodyHtml}
                  onChange={handleBodyChange}
                  onEditorReady={handleEditorReady}
                />
              </div>

              {/* Variables panel */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  Available Variables
                </label>
                <p className="mb-2 text-xs text-gray-400">Click to copy, then paste into the editor or subject line.</p>
                <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  {template.variables.map(v => (
                    <button
                      key={v.key}
                      onClick={() => copyVariable(v.key)}
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white"
                    >
                      <code
                        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: ACCENT + '18', color: ACCENT }}
                      >
                        {`{{${v.key}}}`}
                      </code>
                      <span className="flex-1 text-[11px] text-gray-500">{v.description}</span>
                      {copiedVar === v.key
                        ? <IconCheck size={11} style={{ color: ACCENT }} className="shrink-0 mt-0.5" />
                        : <IconClipboardCopy size={11} className="shrink-0 mt-0.5 text-gray-300" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Preview panel ───────────────────────────────────── */}
          <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
            {/* Preview toolbar */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-2.5">
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode === 'desktop' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  style={previewMode === 'desktop' ? { backgroundColor: ACCENT } : {}}
                >
                  <IconDeviceDesktop size={13} /> Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode === 'mobile' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  style={previewMode === 'mobile' ? { backgroundColor: ACCENT } : {}}
                >
                  <IconDeviceMobile size={13} /> Mobile
                </button>
              </div>
              <div className="flex items-center gap-2">
                {testResult === 'sent' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                    <IconCheck size={12} /> Test sent to matt@formula14.com.au
                  </span>
                )}
                {testResult === 'error' && (
                  <span className="text-xs text-red-500">Send failed</span>
                )}
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {sendingTest
                    ? <IconRefresh size={12} className="animate-spin" />
                    : <IconSend size={12} />}
                  {sendingTest ? 'Sending…' : 'Send Test Email'}
                </button>
              </div>
            </div>

            {/* iframe preview */}
            <div className="flex flex-1 items-start justify-center overflow-y-auto p-6">
              <div
                className="overflow-hidden rounded-xl shadow-lg transition-all duration-300"
                style={{ width: previewMode === 'desktop' ? '100%' : '375px', maxWidth: '640px' }}
              >
                <iframe
                  srcDoc={previewHtml}
                  title="Email preview"
                  className="block w-full border-0"
                  style={{ minHeight: '600px', height: '100%' }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
