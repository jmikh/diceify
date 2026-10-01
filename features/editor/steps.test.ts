import { describe, expect, it } from 'vitest'
import { canAdvance, canEnter, needsResetConfirm, nextStep, prevStep, STEP_LABELS, STEPS, stepIndex } from './steps'

describe('steps', () => {
  it('orders crop → tune → build with a label each', () => {
    expect(STEPS).toEqual(['crop', 'tune', 'build'])
    for (const step of STEPS) expect(STEP_LABELS[step]).toBeTruthy()
    expect(stepIndex('tune')).toBe(1)
  })

  it('nextStep/prevStep walk the list and return null at the ends', () => {
    expect(nextStep('crop')).toBe('tune')
    expect(nextStep('tune')).toBe('build')
    expect(nextStep('build')).toBeNull()
    expect(prevStep('build')).toBe('tune')
    expect(prevStep('tune')).toBe('crop')
    expect(prevStep('crop')).toBeNull()
  })

  it('canAdvance needs a crop to leave crop', () => {
    expect(canAdvance('crop', { hasCrop: false })).toBe(false)
    expect(canAdvance('crop', { hasCrop: true })).toBe(true)
    expect(canAdvance('tune', { hasCrop: false })).toBe(true)
    expect(canAdvance('build', { hasCrop: true })).toBe(false)
  })

  it('canEnter allows crop always and the later steps once there is a crop', () => {
    expect(canEnter('crop', { hasCrop: false })).toBe(true)
    expect(canEnter('tune', { hasCrop: false })).toBe(false)
    expect(canEnter('build', { hasCrop: false })).toBe(false)
    expect(canEnter('tune', { hasCrop: true })).toBe(true)
    expect(canEnter('build', { hasCrop: true })).toBe(true)
  })

  it('needsResetConfirm only when leaving build with progress', () => {
    expect(needsResetConfirm('build', 'tune', { x: 3, y: 0 })).toBe(true)
    expect(needsResetConfirm('build', 'crop', { x: 0, y: 2 })).toBe(true)
    expect(needsResetConfirm('build', 'tune', { x: 0, y: 0 })).toBe(false)
    expect(needsResetConfirm('build', 'build', { x: 3, y: 1 })).toBe(false)
    expect(needsResetConfirm('tune', 'crop', { x: 3, y: 1 })).toBe(false)
  })
})
