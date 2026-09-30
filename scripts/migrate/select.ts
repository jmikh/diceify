// Read-only selection of the legacy Prisma rows (plan → "Existing data"): paid users (any non-explorer plan,
// subscription status or Stripe customer) plus users active since `since` (user or project updatedAt).

export const DEFAULT_ACTIVE_DAYS = 30

export const LEGACY_USER_COLUMNS = [
  'id',
  'email',
  'name',
  'image',
  'createdAt',
  'updatedAt',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'subscriptionStatus',
  'subscriptionExpiresAt',
  'planType',
  'isPro',
] as const

export const LEGACY_PROJECT_COLUMNS = [
  'id',
  'name',
  'userId',
  'originalImage',
  'numRows',
  'colorMode',
  'contrast',
  'gamma',
  'edgeSharpening',
  'rotate6',
  'rotate3',
  'rotate2',
  'gridWidth',
  'gridHeight',
  'currentX',
  'currentY',
  'totalDice',
  'completedDice',
  'percentComplete',
  'cropX',
  'cropY',
  'cropWidth',
  'cropHeight',
  'cropRotation',
  'createdAt',
  'updatedAt',
] as const

export interface SqlQuery {
  text: string
  values: unknown[]
}

const quoted = (columns: readonly string[], alias: string) => columns.map((c) => `${alias}."${c}"`).join(', ')

export const PAID_OR_ACTIVE_WHERE = `u."planType" <> 'explorer' or u."subscriptionStatus" is not null or u."stripeCustomerId" is not null
   or u."updatedAt" >= $1
   or exists (select 1 from "Project" p where p."userId" = u.id and p."updatedAt" >= $1)`

/** `since` = activity cut-off; `only` restricts to one email (case-insensitive). Ordered by creation for stable logs. */
export function buildUserSelection(opts: { since: Date; only?: string }): SqlQuery {
  const values: unknown[] = [opts.since]
  let where = `(${PAID_OR_ACTIVE_WHERE})`
  if (opts.only) {
    values.push(opts.only.trim().toLowerCase())
    where += `\n  and lower(u.email) = $${values.length}`
  }
  return {
    text: `select ${quoted(LEGACY_USER_COLUMNS, 'u')} from "User" u\nwhere ${where}\norder by u."createdAt", u.id`,
    values,
  }
}

/** A user's projects, newest first (a limit-enforcing run keeps the most recent ones). */
export function buildProjectSelection(userId: string): SqlQuery {
  return {
    text: `select ${quoted(LEGACY_PROJECT_COLUMNS, 'p')} from "Project" p where p."userId" = $1 order by p."updatedAt" desc, p.id`,
    values: [userId],
  }
}

export function defaultSince(now: Date, days = DEFAULT_ACTIVE_DAYS): Date {
  return new Date(now.getTime() - days * 86_400_000)
}

/** `--since` value (ISO date or datetime) → Date; throws on garbage. */
export function parseSince(arg: string | undefined, now: Date): Date {
  if (arg === undefined || arg === '') return defaultSince(now)
  const t = Date.parse(arg)
  if (Number.isNaN(t)) throw new Error(`--since: cannot parse "${arg}" (use YYYY-MM-DD)`)
  return new Date(t)
}

/**
 * Prisma stores `DateTime` as `timestamp(3)` WITHOUT time zone, in UTC. node-postgres parses that type as local time,
 * which would shift every legacy timestamp by the machine's UTC offset; install this as the parser for OID 1114.
 */
export function parseLegacyTimestamp(value: string): Date {
  const d = new Date(`${value.trim().replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) throw new Error(`unparsable legacy timestamp "${value}"`)
  return d
}
