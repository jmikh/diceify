import { describe, expect, it } from 'vitest'
import { resolveGate } from './useGate'

describe('resolveGate', () => {
  it('allows regardless of sign-in state', () => {
    expect(resolveGate(true, false)).toEqual({ kind: 'allow' })
    expect(resolveGate(true, true, { modal: 'limit' })).toEqual({ kind: 'allow' })
    expect(resolveGate(true, false, { requires: 'account' })).toEqual({ kind: 'allow' })
  })

  it('shows plan gates the same modal signed in or not (pricing before sign-in)', () => {
    for (const signedIn of [false, true]) {
      expect(resolveGate(false, signedIn)).toEqual({ kind: 'modal', modal: 'proFeature' })
      expect(resolveGate(false, signedIn, { modal: 'limit' })).toEqual({ kind: 'modal', modal: 'limit' })
    }
  })

  it('sends anonymous users of an account gate to sign in, with the given message', () => {
    expect(resolveGate(false, false, { requires: 'account' })).toEqual({ kind: 'signIn', message: undefined })
    expect(resolveGate(false, false, { requires: 'account', signInMessage: 'Sign in to share' })).toEqual({
      kind: 'signIn',
      message: 'Sign in to share',
    })
  })
})
