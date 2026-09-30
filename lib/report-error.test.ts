import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sentry = vi.hoisted(() => ({
  isEnabled: vi.fn(() => true),
  captureException: vi.fn(() => 'event-id'),
  setUser: vi.fn(),
}))
vi.mock('@sentry/nextjs', () => sentry)

import { reportError, setErrorUser } from './report-error'

const error = new Error('boom')

beforeEach(() => {
  vi.clearAllMocks()
  sentry.isEnabled.mockReturnValue(true)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reportError', () => {
  it('captures with the where tag and extra when Sentry is enabled', () => {
    reportError(error, { where: 'dice-pipeline', extra: { grid: 30 } })
    expect(sentry.captureException).toHaveBeenCalledWith(error, { tags: { where: 'dice-pipeline' }, extra: { grid: 30 } })
    // NODE_ENV is 'test' here: sent to Sentry → no console (production behaviour)
    expect(console.error).not.toHaveBeenCalled()
  })

  it('falls back to console.error once when Sentry is not enabled (no DSN, node)', () => {
    sentry.isEnabled.mockReturnValue(false)
    reportError(error, { where: 'upload' })
    expect(sentry.captureException).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith('[upload]', error)
  })

  it('defaults the site to "unknown"', () => {
    reportError('plain string')
    expect(sentry.captureException).toHaveBeenCalledWith('plain string', { tags: { where: 'unknown' }, extra: undefined })
  })
})

describe('setErrorUser', () => {
  it('sets only the id', () => {
    setErrorUser('user-1')
    expect(sentry.setUser).toHaveBeenCalledWith({ id: 'user-1' })
  })

  it('clears the user with null', () => {
    setErrorUser(null)
    expect(sentry.setUser).toHaveBeenCalledWith(null)
  })
})
