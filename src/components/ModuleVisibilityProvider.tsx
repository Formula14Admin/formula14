'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_VISIBILITY,
  MODULE_VISIBILITY_KEY,
  MODULE_VISIBILITY_STORAGE_KEY,
  mergeWithDefaults,
  type ModuleVisibility,
} from '@/lib/module-visibility'

const ModuleVisibilityContext = createContext<ModuleVisibility>(DEFAULT_VISIBILITY)

export function useModuleVisibility() {
  return useContext(ModuleVisibilityContext)
}

export default function ModuleVisibilityProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibility] = useState<ModuleVisibility>(DEFAULT_VISIBILITY)

  useEffect(() => {
    // Load from cache instantly
    try {
      const cached = localStorage.getItem(MODULE_VISIBILITY_STORAGE_KEY)
      if (cached) setVisibility(mergeWithDefaults(JSON.parse(cached)))
    } catch { /* ignore */ }

    // Fetch from Supabase in background
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', MODULE_VISIBILITY_KEY)
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const merged = mergeWithDefaults(data.value as Partial<ModuleVisibility>)
          setVisibility(merged)
          try {
            localStorage.setItem(MODULE_VISIBILITY_STORAGE_KEY, JSON.stringify(merged))
          } catch { /* ignore */ }
        }
      })
  }, [])

  return (
    <ModuleVisibilityContext.Provider value={visibility}>
      {children}
    </ModuleVisibilityContext.Provider>
  )
}
