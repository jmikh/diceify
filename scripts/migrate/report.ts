// Counters, the summary table and the per-user JSON report shape.

export interface Counts {
  users: { selected: number; created: number; existedByLegacyId: number; existedByEmail: number; updated: number; failed: number }
  projects: { selected: number; migrated: number; skippedNoImage: number; skippedExisting: number; skippedOverLimit: number; failed: number }
  bytesUploaded: number
  /** Bytes a dry run would have uploaded. */
  bytesPlanned: number
  stripe: { synced: number; notFound: number; errors: number; skipped: number }
}

export function emptyCounts(): Counts {
  return {
    users: { selected: 0, created: 0, existedByLegacyId: 0, existedByEmail: 0, updated: 0, failed: 0 },
    projects: { selected: 0, migrated: 0, skippedNoImage: 0, skippedExisting: 0, skippedOverLimit: 0, failed: 0 },
    bytesUploaded: 0,
    bytesPlanned: 0,
    stripe: { synced: 0, notFound: 0, errors: 0, skipped: 0 },
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatSummary(c: Counts, opts: { dryRun: boolean; stripeSkippedReason: string | null }): string {
  const u = c.users
  const p = c.projects
  const s = c.stripe
  const prefix = opts.dryRun ? 'DRY RUN — nothing written\n' : ''
  const storage = opts.dryRun
    ? `storage   would upload ${formatBytes(c.bytesPlanned)}`
    : `storage   uploaded ${formatBytes(c.bytesUploaded)}`
  const skipped = s.skipped > 0 && opts.stripeSkippedReason ? ` | skipped ${s.skipped} (${opts.stripeSkippedReason})` : ''
  return (
    prefix +
    `users     selected ${u.selected} | created ${u.created} | existed(legacy_id) ${u.existedByLegacyId} | existed(email) ${u.existedByEmail} | updated ${u.updated} | failed ${u.failed}\n` +
    `projects  selected ${p.selected} | migrated ${p.migrated} | skipped: no-image ${p.skippedNoImage}, existing ${p.skippedExisting}, over-limit ${p.skippedOverLimit} | failed ${p.failed}\n` +
    `${storage}\n` +
    `stripe    synced ${s.synced} | not-found ${s.notFound} | errors ${s.errors}${skipped}`
  )
}

export interface ProjectReport {
  legacyId: string
  projectId: string | null
  action: 'migrated' | 'skipped-no-image' | 'skipped-existing' | 'skipped-over-limit' | 'failed'
  reason?: string
}

export interface UserReport {
  legacyId: string
  email?: string
  profileId: string | null
  action: 'created' | 'existing-by-legacy-id' | 'existing-by-email' | 'failed'
  plan: string
  stripe: 'synced' | 'not-found' | 'error' | 'skipped' | 'no-customer'
  error?: string
  projects: ProjectReport[]
}

export interface RunReport {
  generatedAt: string
  dryRun: boolean
  since: string
  counts: Counts
  users: UserReport[]
}
