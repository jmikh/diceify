import type { Plan } from '@/core/billing'

/** What a plan is called in the UI (lifetime is grandfathered: it shows as Pro, no dedicated copy). */
export function planDisplayName(plan: Plan): string {
  switch (plan) {
    case 'lifetime':
      return 'Pro'
    case 'studio':
      return 'Studio'
    case 'creator':
      return 'Creator pass'
    default:
      return 'Explorer'
  }
}

/** `Sep 30, 2026` — the one date format billing copy uses. */
export function formatBillingDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
