'use client'

import { useState, useEffect, useCallback } from 'react'
import { IconPlus, IconRefresh } from '@tabler/icons-react'
import {
  Transaction,
  rowToTransaction,
  ACCENT,
} from '../_shared'
import { TransactionsTab } from '../_transactions'
import { supabase } from '@/lib/supabase'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showAdd,      setShowAdd]      = useState(false)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .order('date', { ascending: false })
    if (!error && data) setTransactions(data.map(rowToTransaction))
    setLoading(false)
  }, [])

  useEffect(() => { void fetchTransactions() }, [fetchTransactions])

  const addTransaction = useCallback(async (t: Transaction) => {
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert({
        date:            t.date,
        description:     t.description,
        type:            t.type,
        category:        t.category,
        amount:          t.amount,
        reference:       t.reference || null,
        notes:           t.notes || null,
        receipt_url:     t.receiptUrl ?? null,
        gst_amount:      t.gstAmount ?? null,
        payment_method:  t.paymentMethod ?? null,
        is_reimbursable: t.isReimbursable ?? false,
        source:          'manual',
      })
      .select()
      .single()
    if (!error && data) setTransactions(prev => [rowToTransaction(data), ...prev])
  }, [])

  const delTransaction = useCallback(async (id: string) => {
    await supabase.from('finance_transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500">All business income and expense records</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchTransactions()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <IconRefresh size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              <IconPlus size={15} /> Add Transaction
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: ACCENT }} />
          </div>
        ) : (
          <TransactionsTab
            transactions={transactions}
            onAdd={addTransaction}
            onDelete={delTransaction}
            showAddModalProp={showAdd}
            onAddModalClose={() => setShowAdd(false)}
          />
        )}
      </div>
    </div>
  )
}
