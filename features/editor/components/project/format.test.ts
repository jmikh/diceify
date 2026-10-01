import { describe, expect, it } from 'vitest'
import { formatBuilt, formatEdited, formatPercent } from './format'

describe('project list formatting', () => {
  it('formatPercent keeps one decimal, none for whole numbers', () => {
    expect(formatPercent(17.58)).toBe('17.6%')
    expect(formatPercent(100)).toBe('100%')
    expect(formatPercent(0.04)).toBe('0%')
  })

  it('formatBuilt says when nothing is built', () => {
    expect(formatBuilt(0)).toBe('Not built yet')
    expect(formatBuilt(25)).toBe('25% built')
  })

  it('formatEdited says Today for the same day', () => {
    const now = new Date('2026-10-01T15:00:00')
    expect(formatEdited('2026-10-01T09:00:00', now)).toBe('Today')
    expect(formatEdited('2026-09-28T09:00:00', now)).not.toBe('Today')
  })
})
