// Deleting an account (App Store guideline 5.1.1(v); the web offers it too). Order: cancel the Stripe subscription
// (a deleted user must never be charged again), remove the user's storage objects (originals, thumbnails, share
// cards: nothing cascades from `auth.users` into storage), then delete the auth user, which cascades `profiles` →
// `projects`, `shares`. Node-compatible (no Deno globals) so the integration test drives it against the local stack.

import type { SupabaseClient } from '@supabase/supabase-js'

const PROJECT_IMAGES = 'project-images'
const SHARE_IMAGES = 'share-images'
const REMOVE_BATCH = 100

/** What the function needs from Stripe. */
export interface SubscriptionCanceller {
  /** Cancel immediately. Must not throw when the subscription is already gone. */
  cancelSubscription(id: string): Promise<void>
}

export interface DeleteAccountResult {
  deleted: true
  projects: number
  shares: number
  cancelledSubscription: string | null
}

/** Statuses under which a Stripe subscription still bills or may bill again. */
const BILLING_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused'])

async function removeObjects(admin: SupabaseClient, bucket: string, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + REMOVE_BATCH))
    if (error) throw new Error(`remove from ${bucket}: ${error.message}`)
  }
}

export async function deleteAccount(admin: SupabaseClient, stripe: SubscriptionCanceller | null, userId: string): Promise<DeleteAccountResult> {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('stripe_subscription_id, subscription_status')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) throw new Error(`profile: ${profileError.message}`)

  let cancelledSubscription: string | null = null
  const subscriptionId = profile?.stripe_subscription_id ?? null
  if (stripe && subscriptionId && profile?.subscription_status && BILLING_STATUSES.has(profile.subscription_status)) {
    await stripe.cancelSubscription(subscriptionId)
    cancelledSubscription = subscriptionId
  }

  const { data: projects, error: projectsError } = await admin.from('projects').select('image_path').eq('owner_id', userId)
  if (projectsError) throw new Error(`projects: ${projectsError.message}`)
  const imagePaths = projects.flatMap((p: { image_path: string }) => [p.image_path, p.image_path.replace(/[^/]*$/, 'preview.jpg')])
  await removeObjects(admin, PROJECT_IMAGES, imagePaths)

  const { data: shares, error: sharesError } = await admin.from('shares').select('id').eq('owner_id', userId)
  if (sharesError) throw new Error(`shares: ${sharesError.message}`)
  await removeObjects(admin, SHARE_IMAGES, shares.map((s: { id: string }) => `${s.id}.jpg`))

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) throw new Error(`delete user: ${deleteError.message}`)

  return { deleted: true, projects: projects.length, shares: shares.length, cancelledSubscription }
}
