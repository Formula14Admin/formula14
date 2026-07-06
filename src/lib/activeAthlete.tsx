'use client'

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

export interface AthleteOption {
  id:        string
  firstName: string
  lastName:  string
  dob:       string | null
}

interface ActiveAthleteContextValue {
  athletes:      AthleteOption[]
  activeId:      string | null
  activeAthlete: AthleteOption | null
  switchAthlete: (id: string) => void
  loading:       boolean
  reload:        () => Promise<void>
}

const ActiveAthleteContext = createContext<ActiveAthleteContextValue>({
  athletes: [], activeId: null, activeAthlete: null,
  switchAthlete: () => {}, loading: true, reload: async () => {},
})

export function ActiveAthleteProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const userId = session?.user?.id as string | undefined

  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, date_of_birth')
      .eq('user_id', userId)
      .order('first_name')

    const list: AthleteOption[] = (data ?? []).map(r => ({
      id:        r.id,
      firstName: r.first_name    ?? '',
      lastName:  r.last_name     ?? '',
      dob:       r.date_of_birth ?? null,
    }))

    setAthletes(list)

    const storageKey = `f14_active_athlete_${userId}`
    const saved      = localStorage.getItem(storageKey)
    const savedValid = saved && list.some(a => a.id === saved)
    const resolved   = savedValid ? saved : (list[0]?.id ?? null)
    setActiveId(resolved)
    if (resolved && !savedValid) localStorage.setItem(storageKey, resolved)

    setLoading(false)
  }, [userId])

  useEffect(() => { void load() }, [load])

  function switchAthlete(id: string) {
    setActiveId(id)
    if (userId) localStorage.setItem(`f14_active_athlete_${userId}`, id)
  }

  const activeAthlete = athletes.find(a => a.id === activeId) ?? null

  return (
    <ActiveAthleteContext.Provider value={{ athletes, activeId, activeAthlete, switchAthlete, loading, reload: load }}>
      {children}
    </ActiveAthleteContext.Provider>
  )
}

export function useActiveAthlete() {
  return useContext(ActiveAthleteContext)
}
