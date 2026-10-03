import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import AccountScreen from '@/features/billing/AccountScreen'
import { pageMetadata } from '@/lib/seo'

// Private page: noindex (robots.txt no longer disallows it, so crawlers can actually see the directive), its own
// title, and no canonical/og:url inherited from the editor layout.
export const metadata: Metadata = pageMetadata({
  title: 'Account',
  description: 'Your Diceify account: plan, billing and projects.',
  path: '/account',
  noindex: true,
})

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
