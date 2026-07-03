'use client'

import { useState, useEffect } from 'react'
import { Transaction, loadTransactions } from '../_shared'
import { ReportsTab } from '../_reports'

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    setTransactions(loadTransactions([]))
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Monthly P&amp;L, revenue trends, and financial performance</p>
      </div>
      <div className="p-6">
        <ReportsTab transactions={transactions} />
      </div>
    </div>
  )
}
