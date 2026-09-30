import { describe, expect, it } from 'vitest'
import { buildProjectSelection, buildUserSelection, defaultSince, parseLegacyTimestamp, parseSince } from './select'

const NOW = new Date('2026-09-30T12:00:00Z')

describe('buildUserSelection', () => {
  it('selects paid users or users/projects active since $1', () => {
    const since = new Date('2026-08-31T12:00:00Z')
    const q = buildUserSelection({ since })
    expect(q.values).toEqual([since])
    expect(q.text).toContain(`u."planType" <> 'explorer'`)
    expect(q.text).toContain(`u."subscriptionStatus" is not null`)
    expect(q.text).toContain(`u."stripeCustomerId" is not null`)
    expect(q.text).toContain(`u."updatedAt" >= $1`)
    expect(q.text).toContain(`p."userId" = u.id and p."updatedAt" >= $1`)
    expect(q.text).not.toContain('$2')
    expect(q.text).toMatch(/from "User" u/)
    expect(q.text).toMatch(/order by u."createdAt", u.id$/)
  })

  it('--only narrows to one lower-cased email as $2', () => {
    const q = buildUserSelection({ since: NOW, only: '  Someone@Example.COM ' })
    expect(q.values).toEqual([NOW, 'someone@example.com'])
    expect(q.text).toContain('and lower(u.email) = $2')
  })

  it('never selects columns that are not migrated', () => {
    const q = buildUserSelection({ since: NOW })
    expect(q.text).not.toMatch(/birthday|commissionInterest|emailVerified|proSince/)
  })
})

describe('buildProjectSelection', () => {
  it('lists a user’s projects newest first', () => {
    const q = buildProjectSelection('user_1')
    expect(q.values).toEqual(['user_1'])
    expect(q.text).toContain('where p."userId" = $1')
    expect(q.text).toContain('order by p."updatedAt" desc')
    expect(q.text).toContain('"originalImage"')
    expect(q.text).toContain('"cropRotation"')
  })
})

describe('since', () => {
  it('defaults to 30 days before now', () => {
    expect(defaultSince(NOW).toISOString()).toBe('2026-08-31T12:00:00.000Z')
    expect(parseSince(undefined, NOW)).toEqual(defaultSince(NOW))
    expect(parseSince('', NOW)).toEqual(defaultSince(NOW))
  })

  it('parses an ISO date and rejects garbage', () => {
    expect(parseSince('2026-01-15', NOW).toISOString()).toBe('2026-01-15T00:00:00.000Z')
    expect(() => parseSince('yesterday', NOW)).toThrow(/--since/)
  })
})

describe('parseLegacyTimestamp', () => {
  it('reads a timezone-less Prisma timestamp as UTC (with or without milliseconds)', () => {
    expect(parseLegacyTimestamp('2025-11-13 19:10:47.741').toISOString()).toBe('2025-11-13T19:10:47.741Z')
    expect(parseLegacyTimestamp('2025-11-13 19:10:47').toISOString()).toBe('2025-11-13T19:10:47.000Z')
  })
  it('rejects garbage', () => {
    expect(() => parseLegacyTimestamp('not a date')).toThrow(/unparsable/)
  })
})
