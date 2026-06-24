'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { IconSend, IconSparkles, IconUser, IconRefresh } from '@tabler/icons-react'
import { Transaction, PersonalTx, CHART_HISTORY, monthTotal, fmtMoney, fmtK, ACCENT } from './_shared'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  'How is the business performing financially this month?',
  'What are my biggest expenses and can I reduce them?',
  'Am I on track to hit my revenue targets this financial year?',
  'Give me a cashflow health check.',
  'What is my profit margin and how does it compare to last month?',
  'Which revenue stream is growing the fastest?',
]

function buildFinancialContext(transactions: Transaction[], personalTxns: PersonalTx[]): string {
  const junIncome   = monthTotal(transactions, '2026-06', 'income')
  const junExpenses = monthTotal(transactions, '2026-06', 'expense')
  const junNet      = junIncome - junExpenses
  const mayIncome   = monthTotal(transactions, '2026-05', 'income')
  const mayExpenses = monthTotal(transactions, '2026-05', 'expense')
  const mayNet      = mayIncome - mayExpenses
  const ytdIncome   = CHART_HISTORY.reduce((s, m) => s + m.income, 0) + mayIncome + junIncome
  const ytdExpenses = CHART_HISTORY.reduce((s, m) => s + m.expenses, 0) + mayExpenses + junExpenses
  const ytdNet      = ytdIncome - ytdExpenses

  // Category breakdown for June
  const junRevByCat: Record<string, number> = {}
  const junExpByCat: Record<string, number> = {}
  transactions.filter(t => t.date.startsWith('2026-06')).forEach(t => {
    if (t.type === 'income')  junRevByCat[t.category]  = (junRevByCat[t.category]  ?? 0) + t.amount
    if (t.type === 'expense') junExpByCat[t.category]  = (junExpByCat[t.category]  ?? 0) + t.amount
  })

  const revBreakdown = Object.entries(junRevByCat).sort((a,b) => b[1]-a[1])
    .map(([k, v]) => `  - ${k}: ${fmtMoney(v)}`).join('\n')
  const expBreakdown = Object.entries(junExpByCat).sort((a,b) => b[1]-a[1])
    .map(([k, v]) => `  - ${k}: ${fmtMoney(v)}`).join('\n')

  const personalIncome   = personalTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const personalExpenses = personalTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return `## Current Financial Snapshot — Formula14 Operations Hub

### Business Finances (June 2026, partial month)
- Revenue: ${fmtMoney(junIncome)}
- Expenses: ${fmtMoney(junExpenses)}
- Net Profit: ${fmtMoney(junNet)} (${junNet >= 0 ? 'profitable' : 'operating at a loss'})
- Gross Margin: ${junIncome > 0 ? ((junNet / junIncome) * 100).toFixed(1) : '0'}%

### May 2026 (for comparison)
- Revenue: ${fmtMoney(mayIncome)}
- Expenses: ${fmtMoney(mayExpenses)}
- Net Profit: ${fmtMoney(mayNet)}

### Year to Date (Jul 2025 – Jun 2026)
- Total Revenue: ${fmtK(ytdIncome)}
- Total Expenses: ${fmtK(ytdExpenses)}
- Net Profit: ${fmtK(ytdNet)}

### June Revenue Breakdown
${revBreakdown}

### June Expense Breakdown
${expBreakdown}

### Outstanding
- Outstanding invoices: $2,419 (3 invoices)
- Weekly membership revenue: ~${fmtMoney(Math.round(monthTotal(transactions, '2026-06', 'income') / 3))}

### Personal Finances (June 2026)
- Personal income: ${fmtMoney(personalIncome)}
- Personal expenses: ${fmtMoney(personalExpenses)}
- Personal savings this month: ${fmtMoney(personalIncome - personalExpenses)}

### Notes
- Data covers May and June 2026 in full transaction detail; Jan–Apr 2026 available as monthly totals only
- Business and personal finances are tracked separately`
}

export function AskClaudeTab({ transactions, personalTxns }: {
  transactions: Transaction[]
  personalTxns: PersonalTx[]
}) {
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [streamText,   setStreamText]   = useState('')
  const [error,        setError]        = useState<string | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  const context = useMemo(() => buildFinancialContext(transactions, personalTxns), [transactions, personalTxns])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setStreamText('')
    setError(null)

    try {
      const res = await fetch('/api/finance-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, financialContext: context }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')
      const dec = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value, { stream: true })
        full += chunk
        setStreamText(full)
      }
      setMessages(prev => [...prev, { role: 'assistant', content: full }])
      setStreamText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const isEmpty = messages.length === 0 && !loading

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm" style={{ minHeight: 500 }}>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT + '1a' }}>
            <IconSparkles size={16} style={{ color: ACCENT }} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Ask Claude</h2>
            <p className="text-xs text-gray-400">Your AI financial assistant — powered by real Formula14 data</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setStreamText(''); setError(null) }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <IconRefresh size={13} /> New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT + '1a' }}>
              <IconSparkles size={24} style={{ color: ACCENT }} />
            </div>
            <p className="mb-1 text-base font-semibold text-gray-800">Ask me anything about your finances</p>
            <p className="mb-8 text-sm text-gray-400">I have access to your current business and personal financial data.</p>
            <div className="grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-left text-sm text-gray-600 transition hover:border-[#6BA3D6]/40 hover:bg-[#6BA3D6]/5 hover:text-gray-800"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT + '1a' }}>
                  <IconSparkles size={14} style={{ color: ACCENT }} />
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'rounded-tr-sm text-white'
                    : 'rounded-tl-sm bg-gray-50 text-gray-800'
                }`}
                style={m.role === 'user' ? { backgroundColor: ACCENT } : {}}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <IconUser size={14} className="text-gray-500" />
                </span>
              )}
            </div>
          ))}

          {/* Streaming assistant message */}
          {streamText && (
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT + '1a' }}>
                <IconSparkles size={14} style={{ color: ACCENT }} />
              </span>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                {streamText}
                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-gray-400" />
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {loading && !streamText && (
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT + '1a' }}>
                <IconSparkles size={14} style={{ color: ACCENT }} />
              </span>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition focus-within:border-[#6BA3D6] focus-within:ring-2 focus-within:ring-[#6BA3D6]/10">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances… (Enter to send)"
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-50"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            <IconSend size={15} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          Claude has access to your current financial data. For formal advice, consult your accountant.
        </p>
      </div>
    </div>
  )
}
