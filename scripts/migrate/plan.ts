// Idempotency decisions (pure): what to do with a legacy user / project given what the target already holds.

export type UserDecision =
  | { action: 'existing-by-legacy-id'; profileId: string }
  | { action: 'existing-by-email'; profileId: string }
  | { action: 'create' }

/** `legacy_id` wins over the email match (a rerun after an email change still finds the row). */
export function decideUser(found: { byLegacyId: string | null; byEmail: string | null }): UserDecision {
  if (found.byLegacyId) return { action: 'existing-by-legacy-id', profileId: found.byLegacyId }
  if (found.byEmail) return { action: 'existing-by-email', profileId: found.byEmail }
  return { action: 'create' }
}

export type ProjectDecision = 'skip-no-image' | 'skip-existing' | 'migrate'

/** An existing row (by `legacy_id`) is never touched again, even if it has no image today. */
export function decideProject(input: { hasImage: boolean; existingByLegacyId: boolean }): ProjectDecision {
  if (input.existingByLegacyId) return 'skip-existing'
  if (!input.hasImage) return 'skip-no-image'
  return 'migrate'
}
