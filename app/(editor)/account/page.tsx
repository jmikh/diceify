'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import AccountScreen from '@/features/billing/AccountScreen'

// Suspense is required around useSearchParams (the ?checkout=success return from Stripe)
export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white/60">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <AccountScreen />
    </Suspense>
  )
}
