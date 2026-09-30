import { describe, expect, it } from 'vitest'
import { resolveGate } from './useGate'

describe('resolveGate', () => {
  it('allows regardless of sign-in state', () => {
    expect(resolveGate(true, false)).toEqual({ kind: 'allow' })
    expect(resolveGate(true, true, { modal: 'limit' })).toEqual({ kind: 'allow' })
  })

  it('sends anonymous users to sign in, with the given message', () => {
    expect(resolveGate(false, false)).toEqual({ kind: 'signIn', message: undefined })
    expect(resolveGate(false, false, { signInMessage: 'Sign in to download', modal: 'limit' })).toEqual({
      kind: 'signIn',
      message: 'Sign in to download',
    })
  })

  it('sends signed-in users to the upgrade modal by default, or the requested one', () => {
    expect(resolveGate(false, true)).toEqual({ kind: 'modal', modal: 'proFeature' })
    expect(resolveGate(false, true, { modal: 'limit' })).toEqual({ kind: 'modal', modal: 'limit' })
    expect(resolveGate(false, true, { signInMessage: 'ignored' })).toEqual({ kind: 'modal', modal: 'proFeature' })
  })
})
