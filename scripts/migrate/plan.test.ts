import { describe, expect, it } from 'vitest'
import { decideProject, decideUser } from './plan'

describe('decideUser', () => {
  it('legacy_id match wins', () => {
    expect(decideUser({ byLegacyId: 'p1', byEmail: 'p2' })).toEqual({ action: 'existing-by-legacy-id', profileId: 'p1' })
  })
  it('falls back to the email match', () => {
    expect(decideUser({ byLegacyId: null, byEmail: 'p2' })).toEqual({ action: 'existing-by-email', profileId: 'p2' })
  })
  it('creates when nothing matches', () => {
    expect(decideUser({ byLegacyId: null, byEmail: null })).toEqual({ action: 'create' })
  })
})

describe('decideProject', () => {
  it('existing rows are skipped before anything else', () => {
    expect(decideProject({ hasImage: false, existingByLegacyId: true })).toBe('skip-existing')
    expect(decideProject({ hasImage: true, existingByLegacyId: true })).toBe('skip-existing')
  })
  it('rows without an image are skipped', () => {
    expect(decideProject({ hasImage: false, existingByLegacyId: false })).toBe('skip-no-image')
  })
  it('otherwise migrate', () => {
    expect(decideProject({ hasImage: true, existingByLegacyId: false })).toBe('migrate')
  })
})
