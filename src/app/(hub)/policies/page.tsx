'use client'

import { useState, useRef } from 'react'
import {
  IconPlus,
  IconTrash,
  IconSparkles,
  IconCopy,
  IconCheck,
  IconFileText,
  IconChevronDown,
  IconAlertCircle,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PolicyDoc {
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

const INIT_POLICIES: PolicyDoc[] = [
  {
    id: 'p1',
    title: 'Athlete Code of Conduct',
    status: 'final',
    createdAt: '2026-05-01',
    updatedAt: '2026-06-01',
    content: `PURPOSE
This policy establishes the behavioural expectations for all athletes participating in Formula14 programs.

SCOPE
This policy applies to all athletes regardless of age, program type, or membership tier.

POLICY STATEMENT
All athletes are expected to conduct themselves in a manner that reflects positively on themselves, their families, and Formula14.

EXPECTED CONDUCT
• Treat coaches, staff, and fellow athletes with respect at all times
• Arrive on time and prepared for all sessions
• Follow instructions from coaching staff
• Maintain appropriate language and behaviour on and off the court
• Take care of facility equipment and property
• Represent Formula14 with integrity at external events

CONSEQUENCES
Breaches of this policy may result in a verbal warning, written warning, suspension from sessions, or termination of membership, at management's discretion.

REVIEW DATE
This policy will be reviewed annually.`,
  },
  {
    id: 'p2',
    title: 'Payment & Refund Policy',
    status: 'draft',
    createdAt: '2026-06-10',
    updatedAt: '2026-06-15',
    content: `PURPOSE
To establish clear guidelines for session payments, cancellations, and refunds.

SCOPE
This policy applies to all bookings made through Formula14.

PAYMENT TERMS
• Payment is due at the time of booking unless otherwise arranged
• Accepted payment methods: credit card, bank transfer, pay-at-venue
• All prices are inclusive of GST where applicable

CANCELLATION POLICY
• Cancellations made more than 24 hours before a session: full refund
• Cancellations made within 24 hours of session start: no refund
• No-shows: charged at full session rate (subject to No Show Policy settings)

REFUNDS
• Approved refunds will be processed within 5–7 business days
• Refunds are returned to the original payment method

EXCEPTIONS
Exceptions may be granted at management's discretion for medical emergencies or extenuating circumstances with appropriate documentation.

REVIEW DATE
This policy will be reviewed annually or following any significant pricing change.`,
  },
]

const ACCENT = '#6BA3D6'

const QUICK_PROMPTS = [
  'Draft this policy from scratch based on the title',
  'Write a purpose and scope section',
  'Add a consequences section',
  'Improve the clarity and tone',
  'Make it more concise',
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const [docs, setDocs] = useState<PolicyDoc[]>(INIT_POLICIES)
  const [selectedId, setSelectedId] = useState<string | null>('p1')

  // Editor state
  const [editTitle, setEditTitle] = useState(INIT_POLICIES[0].title)
  const [editContent, setEditContent] = useState(INIT_POLICIES[0].content)
  const [editStatus, setEditStatus] = useState<'draft' | 'final'>(INIT_POLICIES[0].status)
  const [saved, setSaved] = useState(false)

  // AI state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [copied, setCopied] = useState(false)

  const contentRef = useRef<HTMLTextAreaElement>(null)

  // ── Doc management ──────────────────────────────────────────────────────────

  function selectDoc(doc: PolicyDoc) {
    setSelectedId(doc.id)
    setEditTitle(doc.title)
    setEditContent(doc.content)
    setEditStatus(doc.status)
    setAiResponse('')
    setAiError('')
  }

  function newDoc() {
    const doc: PolicyDoc = {
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
        ? { ...d, title: editTitle || 'Untitled Policy', content: editContent, status: editStatus, updatedAt: today() }
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
          docType: 'policy',
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
            <h1 className="text-xl font-bold text-gray-900">Policies</h1>
            <p className="mt-0.5 text-sm text-gray-500">Create and manage organisational policies with AI assistance</p>
          </div>
          <button
            onClick={newDoc}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <IconPlus size={15} /> New Policy
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: document list ─────────────────────────────────────────── */}
        <div className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {docs.length} {docs.length === 1 ? 'Policy' : 'Policies'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <IconFileText size={32} className="text-gray-300" />
                <p className="text-sm text-gray-400">No policies yet.<br />Click "New Policy" to start.</p>
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
                    {doc.title || 'Untitled Policy'}
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
                {/* Status toggle */}
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
                  title="Delete policy"
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
                placeholder="Policy title…"
                className="mb-4 w-full border-0 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
              />
              <textarea
                ref={contentRef}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="Start writing your policy here, or use the AI assistant on the right to generate content…"
                className="w-full resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
                style={{ minHeight: '480px' }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <IconFileText size={48} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Select a policy or create a new one</p>
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
                ? `Writing: ${selectedDoc.title || 'Untitled Policy'}`
                : 'Select a policy to get started'}
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
