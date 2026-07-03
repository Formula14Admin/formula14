'use client'

import { useState, useEffect } from 'react'
import { Transaction, PersonalTx, loadTransactions, loadPersonalTxns } from '../_shared'
import { AskClaudeTab } from '../_claude'

export default function AskClaudePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [personalTxns, setPersonalTxns] = useState<PersonalTx[]>([])

  useEffect(() => {
    setTransactions(loadTransactions([]))
    setPersonalTxns(loadPersonalTxns([]))
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Ask Claude</h1>
        <p className="text-sm text-gray-500">AI-powered financial insights and analysis</p>
      </div>
      <div className="p-6">
        <AskClaudeTab transactions={transactions} personalTxns={personalTxns} />
      </div>
    </div>
  )
}
