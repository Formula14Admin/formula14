'use client'

import { useState, useRef, useEffect } from 'react'
import {
  IconPlus,
  IconTrash,
  IconSparkles,
  IconCopy,
  IconCheck,
  IconClipboardList,
  IconAlertCircle,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcedureDoc {
  id: string
  title: string
  content: string
  status: 'draft' | 'final'
  createdAt: string
  updatedAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10) }

function today() { return new Date().toISOString().slice(0, 10) }

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const INIT_PROCEDURES: ProcedureDoc[] = [
  {
    id: 'pr1',
    title: 'Session Booking Procedure',
    status: 'final',
    createdAt: '2026-05-15',
    updatedAt: '2026-06-01',
    content: `PURPOSE
To outline the steps for booking athlete sessions at Formula14.

SCOPE
This procedure applies to all athletes and parents/guardians booking sessions through the Formula14 portal.

PROCEDURE

1. Log in to the Formula14 portal using your registered email address and password.

2. Navigate to "Book a Session" from the left sidebar.

3. Select the desired session type from the available options (e.g. Small Group, Individual, Casual Shooting).

4. Choose a date from the calendar. Note: availability is determined by coach schedules and facility status.

5. Select an available time slot from the options shown for that date.

6. Complete the booking form, including any required details (e.g. number of athletes, session goals).

7. Review the booking summary, including the total price.

8. Confirm the booking. A confirmation notification will be sent.

NOTES
• Session availability is updated in real-time
• Contact your coach directly for any booking queries
• Refer to the Payment & Refund Policy for cancellation terms`,
  },
  {
    id: 'pr2',
    title: 'Incident Reporting Procedure',
    status: 'draft',
    createdAt: '2026-06-12',
    updatedAt: '2026-06-12',
    content: `PURPOSE
To ensure all incidents occurring at Formula14 are documented and managed appropriately.

SCOPE
This procedure applies to all staff, coaches, and volunteers.

REQUIRED MATERIALS
• Incident Report Form (available at reception)
• First Aid Kit (located at the front desk)

PROCEDURE

1. Ensure the immediate safety of all individuals involved. Call emergency services (000) if required.

2. Administer first aid if trained and appropriate to do so.

3. Notify the coaching staff or facility manager immediately.

4. Separate any witnesses from the scene and take brief initial statements if safe to do so.

5. Complete the Incident Report Form within 24 hours of the incident.

6. Submit the completed form to the facility manager.

7. The facility manager will review the report and determine if further action is required (e.g. insurance notification, SafeWork notification).

NOTES
• All staff are required to hold a current first aid certificate
• Incident reports are stored securely and are confidential
• Reports are reviewed quarterly to identify recurring risks`,
  },
]

const ACCENT = '#6BA3D6'

const QUICK_PROMPTS = [
  'Draft this procedure from scratch based on the title',
  'Write a step-by-step sequence',
  'Add a notes and warnings section',
  'Make the steps clearer and more actionable',
  'Make it more concise',
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProceduresPage() {
  const [docs, setDocs] = useState<ProcedureDoc[]>(() => {
    if (typeof window === 'undefined') return []
    try { const r = localStorage.getItem('f14_procedures'); return r ? JSON.parse(r) : [] } catch { return [] }
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Editor state — initialised from selected doc or blank
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editStatus, setEditStatus] = useState<'draft' | 'final'>('draft')
  const [saved, setSaved] = useState(false)

  // AI state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [copied, setCopied] = useState(false)

  const contentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('f14_procedures', JSON.stringify(docs))
    // Select first doc when docs load
    if (docs.length > 0 && !selectedId) {
      const d = docs[0]
      setSelectedId(d.id); setEditTitle(d.title); setEditContent(d.content); setEditStatus(d.status)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs])

  // ── Doc management ──────────────────────────────────────────────────────────

  function selectDoc(doc: ProcedureDoc) {
    setSelectedId(doc.id)
    setEditTitle(doc.title)
    setEditContent(doc.content)
    setEditStatus(doc.status)
    setAiResponse('')
    setAiError('')
  }

  function newDoc() {
    const doc: ProcedureDoc = {
      id: uid(),
      title: '',
      content: '',
      status: 'draft',
      createdAt: today(),
      updatedAt: today(),
    }
    setDocs(prev => [doc, ...prev])
    selectDoc(doc)
  }

  function saveDoc() {
    if (!selectedId) return
    setDocs(prev => prev.map(d =>
      d.id === selectedId
        ? { ...d, title: editTitle || 'Untitled Procedure', content: editContent, status: editStatus, updatedAt: today() }
        : d
    ))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function deleteDoc() {
    if (!selectedId) return
    const remaining = docs.filter(d => d.id !== selectedId)
    setDocs(remaining)
    if (remaining.length > 0) {
      selectDoc(remaining[0])
    } else {
      setSelectedId(null)
      setEditTitle('')
      setEditContent('')
      setEditStatus('draft')
    }
  }

  // ── AI ──────────────────────────────────────────────────────────────────────

  async function generate(promptOverride?: string) {
    const prompt = (promptOverride ?? aiPrompt).trim()
    if (!prompt) return
    setAiLoading(true)
    setAiResponse('')
    setAiError('')

    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          docType: 'procedure',
          existingContent: editContent || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setAiError(err.error ?? 'Something went wrong.')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setAiResponse(accumulated)
      }
    } catch {
      setAiError('Network error — check your connection and try again.')
    } finally {
      setAiLoading(false)
    }
  }

  function insertResponse() {
    if (!aiResponse) return
    const appended = editContent.trim()
      ? editContent + '\n\n' + aiResponse
      : aiResponse
    setEditContent(appended)
    setTimeout(() => {
      contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  async function copyResponse() {
    await navigator.clipboard.writeText(aiResponse)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedDoc = docs.find(d => d.id === selectedId)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Procedures</h1>
            <p className="mt-0.5 text-sm text-gray-500">Create and manage step-by-step procedures with AI assistance</p>
          </div>
          <button
            onClick={newDoc}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <IconPlus size={15} /> New Procedure
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: document list ─────────────────────────────────────────── */}
        <div className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {docs.length} {docs.length === 1 ? 'Procedure' : 'Procedures'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <IconClipboardList size={32} className="text-gray-300" />
                <p className="text-sm text-gray-400">No procedures yet.<br />Click "New Procedure" to start.</p>
              </div>
            ) : (
              docs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => selectDoc(doc)}
                  className={`w-full border-b border-gray-50 px-4 py-3 text-left transition last:border-0 hover:bg-gray-50 ${
                    selectedId === doc.id ? 'border-l-2 bg-blue-50' : 'border-l-2 border-l-transparent'
                  }`}
                  style={selectedId === doc.id ? { borderLeftColor: ACCENT } : {}}
                >
                  <p className="truncate text-sm font-medium text-gray-900">
                    {doc.title || 'Untitled Procedure'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      doc.status === 'final'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{fmtDate(doc.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Centre: editor ──────────────────────────────────────────────── */}
        {selectedDoc ? (
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {/* Toolbar */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  {(['draft', 'final'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                        editStatus === s
                          ? 'bg-white text-gray-800 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteDoc}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  title="Delete procedure"
                >
                  <IconTrash size={15} />
                </button>
                <button
                  onClick={saveDoc}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: saved ? '#059669' : ACCENT }}
                >
                  {saved ? <><IconCheck size={14} /> Saved</> : 'Save'}
                </button>
              </div>
            </div>

            {/* Editor body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Procedure title…"
                className="mb-4 w-full border-0 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
              />
              <textarea
                ref={contentRef}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="Start writing your procedure here, or use the AI assistant on the right to generate content…"
                className="w-full resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
                style={{ minHeight: '480px' }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <IconClipboardList size={48} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Select a procedure or create a new one</p>
            </div>
          </div>
        )}

        {/* ── Right: AI assistant ─────────────────────────────────────────── */}
        <div className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white">
          {/* Header */}
          <div className="shrink-0 border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <IconSparkles size={16} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold text-gray-800">AI Writing Assistant</span>
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: '#e0f0ff', color: ACCENT }}
              >
                Claude
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {selectedDoc
                ? `Writing: ${selectedDoc.title || 'Untitled Procedure'}`
                : 'Select a procedure to get started'}
            </p>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Quick prompts */}
            <div className="shrink-0 border-b border-gray-100 px-5 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Quick actions</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map(qp => (
                  <button
                    key={qp}
                    onClick={() => { setAiPrompt(qp); generate(qp) }}
                    disabled={aiLoading || !selectedDoc}
                    className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input */}
            <div className="shrink-0 border-b border-gray-100 px-5 py-4">
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate() }}
                placeholder="Ask Claude to write or improve…"
                disabled={!selectedDoc}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                onClick={() => generate()}
                disabled={aiLoading || !aiPrompt.trim() || !selectedDoc}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                <IconSparkles size={14} />
                {aiLoading ? 'Generating…' : 'Generate'}
              </button>
            </div>

            {/* Response area */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {aiError && (
                <div className="mb-3 flex gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                  <IconAlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
              {aiLoading && !aiResponse && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              {aiResponse && (
                <div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">{aiResponse}</pre>
                  {!aiLoading && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={insertResponse}
                        disabled={!selectedDoc}
                        className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: ACCENT }}
                      >
                        Insert into document
                      </button>
                      <button
                        onClick={copyResponse}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                        title="Copy to clipboard"
                      >
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!aiResponse && !aiLoading && !aiError && (
                <p className="text-xs text-gray-400">
                  Generated content will appear here. You can then insert it directly into your document or copy it to the clipboard.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
