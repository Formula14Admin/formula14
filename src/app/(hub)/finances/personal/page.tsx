'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PersonalTx, SavingsGoal,
  loadPersonalTxns, savePersonalTxns,
  loadGoals, saveGoals,
} from '../_shared'
import { PersonalTab } from '../_personal'

export default function PersonalPage() {
  const [personalTxns, setPersonalTxns] = useState<PersonalTx[]>([])
  const [goals,        setGoals]        = useState<SavingsGoal[]>([])
  const [loaded,       setLoaded]       = useState(false)

  useEffect(() => {
    setPersonalTxns(loadPersonalTxns([]))
    setGoals(loadGoals([]))
    setLoaded(true)
  }, [])

  useEffect(() => { if (loaded) savePersonalTxns(personalTxns) }, [personalTxns, loaded])
  useEffect(() => { if (loaded) saveGoals(goals) }, [goals, loaded])

  const addPersonalTx = useCallback((t: PersonalTx) => setPersonalTxns(prev => [t, ...prev]), [])
  const addGoal       = useCallback((g: SavingsGoal) => setGoals(prev => [...prev, g]), [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Personal Finance</h1>
        <p className="text-sm text-gray-500">Personal income, expenses, and savings goals</p>
      </div>
      <div className="p-6">
        <PersonalTab
          txns={personalTxns}
          goals={goals}
          onAddTx={addPersonalTx}
          onAddGoal={addGoal}
        />
      </div>
    </div>
  )
}
