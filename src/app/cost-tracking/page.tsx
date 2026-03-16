'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CostTrackingPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/map?view=costs')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
      <span style={{ color: '#7a8a9b' }} className="text-sm">Redirecting...</span>
    </div>
  )
}
