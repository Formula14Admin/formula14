'use client'

import { useState, useEffect, useCallback } from 'react'
import { IconPlus } from '@tabler/icons-react'
import {
  Transaction,
  loadTransactions, saveTransactions,
  ACCENT,
} from '../_shared'
import { TransactionsTab } from '../_transactions'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loaded,       setLoaded]       = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)

  useEffect(() => {
    setTransactions(loadTransactions([]))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) saveTransactions(transactions)
  }, [transactions, loaded])

  const addTransaction = useCallback((t: Transaction) => setTransactions(prev => [t, ...prev]), [])
  const delTransaction = useCallback((id: string)      => setTransactions(prev => prev.filter(t => t.id !== id)), [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500">All business income and expense records</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <IconPlus size={15} /> Add Transaction
          </button>
        </div>
      </div>
      <div className="p-6">
        <TransactionsTab
          transactions={transactions}
          onAdd={addTransaction}
          onDelete={delTransaction}
          showAddModalProp={showAdd}
          onAddModalClose={() => setShowAdd(false)}
        />
      </div>
    </div>
  )
}
