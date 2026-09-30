import { describe, expect, it } from 'vitest'
import { canAdvance, needsResetConfirm, nextStep, prevStep, STEP_LABELS, STEPS, stepIndex } from './steps'

describe('steps', () => {
  it('orders upload → crop → tune → build with a label each', () => {
    expect(STEPS).toEqual(['upload', 'crop', 'tune', 'build'])
    for (const step of STEPS) expect(STEP_LABELS[step]).toBeTruthy()
    expect(stepIndex('tune')).toBe(2)
  })

  it('nextStep/prevStep walk the list and return null at the ends', () => {
    expect(nextStep('upload')).toBe('crop')
    expect(nextStep('tune')).toBe('build')
    expect(nextStep('build')).toBeNull()
    expect(prevStep('build')).toBe('tune')
    expect(prevStep('crop')).toBe('upload')
    expect(prevStep('upload')).toBeNull()
  })

  it('canAdvance needs an image to leave upload and a crop to leave crop', () => {
    const none = { hasImage: false, hasCrop: false }
    const image = { hasImage: true, hasCrop: false }
    const all = { hasImage: true, hasCrop: true }
    expect(canAdvance('upload', none)).toBe(false)
    expect(canAdvance('upload', image)).toBe(true)
    expect(canAdvance('crop', image)).toBe(false)
    expect(canAdvance('crop', all)).toBe(true)
    expect(canAdvance('tune', none)).toBe(true)
    expect(canAdvance('build', all)).toBe(false)
  })

  it('needsResetConfirm only when leaving build with progress', () => {
    expect(needsResetConfirm('build', 'tune', { x: 3, y: 0 })).toBe(true)
    expect(needsResetConfirm('build', 'upload', { x: 0, y: 2 })).toBe(true)
    expect(needsResetConfirm('build', 'tune', { x: 0, y: 0 })).toBe(false)
    expect(needsResetConfirm('build', 'build', { x: 3, y: 1 })).toBe(false)
    expect(needsResetConfirm('tune', 'crop', { x: 3, y: 1 })).toBe(false)
  })
})
