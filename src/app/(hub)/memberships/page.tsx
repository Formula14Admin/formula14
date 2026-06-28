'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MembershipsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/athletes?tab=members')
  }, [router])
  return null
}
