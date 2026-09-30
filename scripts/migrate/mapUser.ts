// Legacy `User` row → auth user input + `profiles` billing columns (plans/revamp/revamp-step-F1.md → Mapping).
// Pure; every plan/status combination is pinned by mapUser.test.ts.

import type { SnapshotPlan } from '../../supabase/functions/_shared/billing-snapshot'

/** The Prisma `User` columns the migration reads (`LEGACY_USER_COLUMNS`); timestamps arrive as Date from pg. */
export interface LegacyUserRow {
  id: string
  email: string
  name: string | null
  image: string | null
  createdAt: Date
  updatedAt: Date
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  /** 'active' | 'canceled' | 'past_due' | 'trialing' | 'creator_pass' | null */
  subscriptionStatus: string | null
  subscriptionExpiresAt: Date | null
  /** 'explorer' | 'creator' | 'studio' | 'lifetime' */
  planType: string
  isPro: boolean
}

/** The `profiles` columns written after the trigger created the row. */
export interface ProfilePatch {
  legacy_id: string
  plan: SnapshotPlan
  plan_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  current_period_end: string | null
  created_at: string
}

export interface AuthUserInput {
  email: string
  email_confirm: true
  user_metadata: { full_name?: string; avatar_url?: string; legacy_id: string }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null)
const nonEmpty = (v: string | null): string | null => (v && v.trim() !== '' ? v : null)

export function authUserInput(row: LegacyUserRow): AuthUserInput {
  const name = nonEmpty(row.name)
  const avatar = nonEmpty(row.image)
  return {
    email: normalizeEmail(row.email),
    email_confirm: true,
    user_metadata: {
      ...(name ? { full_name: name } : {}),
      ...(avatar ? { avatar_url: avatar } : {}),
      legacy_id: row.id,
    },
  }
}

/**
 * lifetime → lifetime; creator (or the legacy `creator_pass` status) → creator pass with its expiry;
 * studio → studio with the raw status and the period end; anything else → explorer keeping the customer id.
 */
export function mapUserToProfile(row: LegacyUserRow): ProfilePatch {
  const base: ProfilePatch = {
    legacy_id: row.id,
    plan: 'explorer',
    plan_expires_at: null,
    stripe_customer_id: nonEmpty(row.stripeCustomerId),
    stripe_subscription_id: null,
    subscription_status: null,
    current_period_end: null,
    created_at: row.createdAt.toISOString(),
  }
  if (row.planType === 'lifetime') return { ...base, plan: 'lifetime' }
  if (row.planType === 'creator' || row.subscriptionStatus === 'creator_pass') {
    return { ...base, plan: 'creator', plan_expires_at: iso(row.subscriptionExpiresAt) }
  }
  if (row.planType === 'studio') {
    return {
      ...base,
      plan: 'studio',
      stripe_subscription_id: nonEmpty(row.stripeSubscriptionId),
      subscription_status: nonEmpty(row.subscriptionStatus),
      current_period_end: iso(row.subscriptionExpiresAt),
    }
  }
  return base
}
